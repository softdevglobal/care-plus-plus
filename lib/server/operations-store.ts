import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { demoMode, firebase } from './firebase';
import { HttpError } from './auth';
import {
  emptyOperations,
  seedOperations,
  moduleById,
  validateValues,
  validateRelations,
  type OperationsState,
  type OpRecord,
} from '../operations';
import type { Actor } from '../model';
let queue: Promise<unknown> = Promise.resolve();
const file = () =>
  path.join(process.env.DEMO_DATA_DIR || path.join(process.cwd(), '.local'), 'operations.json');
const command = z
  .object({
    action: z.enum(['save', 'archive', 'restore', 'settings']),
    revision: z.number().int().nonnegative(),
    module: z.string().max(40).optional(),
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,100}$/)
      .optional(),
    values: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export function requireOperationsManager(actor: Actor) {
  if (actor.role !== 'provider_admin')
    throw new HttpError(403, 'Operations requires a provider administrator account.');
}
async function localRead(): Promise<OperationsState> {
  try {
    return JSON.parse(await readFile(file(), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    return seedOperations();
  }
}
export async function readOperations(actor: Actor) {
  requireOperationsManager(actor);
  if (demoMode()) {
    await queue;
    return localRead();
  }
  const doc = await firebase().db.collection('operationsWorkspaces').doc(actor.providerId).get();
  return (doc.data() as OperationsState | undefined) || emptyOperations();
}
export function applyOperationsCommand(
  state: OperationsState,
  raw: unknown,
  actor: Actor,
): OperationsState {
  requireOperationsManager(actor);
  const input = command.parse(raw);
  if (input.revision !== state.revision)
    throw new HttpError(409, 'This workspace changed in another window. Refresh and try again.');
  const next = structuredClone(state);
  const now = new Date().toISOString();
  let recordId = 'settings',
    recordTitle = 'Workspace settings';
  if (input.action === 'settings') {
    next.settings = z
      .object({
        name: z.string().trim().min(1).max(160),
        timezone: z.enum([
          'Australia/Sydney',
          'Australia/Melbourne',
          'Australia/Brisbane',
          'Australia/Perth',
          'Australia/Adelaide',
          'Australia/Darwin',
          'Australia/Hobart',
        ]),
        weekStart: z.enum(['Monday', 'Sunday']),
        timeFormat: z.enum(['12-hour', '24-hour']),
        payRun: z.enum(['Weekly', 'Fortnightly', 'Monthly']),
        invoicePrefix: z.string().regex(/^[A-Z0-9-]{1,12}$/),
        invoiceTerms: z.number().int().min(0).max(365),
        address: z.string().max(500),
        email: z.union([z.email(), z.literal('')]),
        phone: z.string().max(40),
      })
      .strict()
      .parse(input.values);
  } else {
    if (!input.module || !moduleById(input.module)) throw new HttpError(400, 'Unknown module.');
    const prior = input.id
      ? next.records.find((r) => r.id === input.id && r.module === input.module)
      : undefined;
    if (input.id && !prior) throw new HttpError(404, 'Record not found.');
    if (input.action === 'save') {
      let values;
      try {
        values = validateValues(input.module, input.values || {});
        validateRelations(input.module, values, next.records, input.id);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      if (prior?.archived) throw new HttpError(400, 'Restore this record before editing.');
      recordId = prior?.id || randomUUID();
      const row: OpRecord = {
        ...prior,
        id: recordId,
        module: input.module,
        reference:
          prior?.reference ||
          `${input.module === 'invoices' ? next.settings.invoicePrefix : input.module.slice(0, 3).toUpperCase()}-${String(next.records.filter((r) => r.module === input.module).length + 1).padStart(4, '0')}`,
        revision: (prior?.revision || 0) + 1,
        createdAt: prior?.createdAt || now,
        updatedAt: now,
        createdBy: prior?.createdBy || actor.name,
        archived: false,
        ...values,
      };
      next.records = prior
        ? next.records.map((r) => (r.id === prior.id ? row : r))
        : [...next.records, row];
      recordTitle = String(row.title || row.name || row.reference);
    } else {
      if (!prior) throw new HttpError(404, 'Record not found.');
      if (input.action === 'restore') {
        try {
          const values = Object.fromEntries(
            moduleById(input.module)!.fields.map((f) => [f.key, prior[f.key] ?? '']),
          );
          validateRelations(input.module, values, next.records, prior.id);
        } catch (e) {
          throw new HttpError(400, (e as Error).message);
        }
      }
      prior.archived = input.action === 'archive';
      prior.revision++;
      prior.updatedAt = now;
      recordId = prior.id;
      recordTitle = String(prior.title || prior.name || prior.reference);
    }
  }
  next.revision++;
  next.events = [
    {
      id: randomUUID(),
      at: now,
      actor: actor.name,
      action: input.action,
      module: input.module || 'account',
      recordId,
      title: recordTitle,
    },
    ...next.events,
  ].slice(0, 500);
  if (Buffer.byteLength(JSON.stringify(next), 'utf8') > 800_000)
    throw new HttpError(
      413,
      'This preview workspace has reached its storage limit. Export your records before expanding it.',
    );
  return next;
}
export async function writeOperations(actor: Actor, input: unknown) {
  requireOperationsManager(actor);
  if (demoMode()) {
    const operation = queue.then(async () => {
      const next = applyOperationsCommand(await localRead(), input, actor);
      await mkdir(path.dirname(file()), { recursive: true });
      const temp = file() + '.' + randomUUID() + '.tmp';
      await writeFile(temp, JSON.stringify(next, null, 2));
      await rename(temp, file());
      return next;
    });
    queue = operation.catch(() => undefined);
    return operation;
  }
  const ref = firebase().db.collection('operationsWorkspaces').doc(actor.providerId);
  return firebase().db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const next = applyOperationsCommand(
      (doc.data() as OperationsState | undefined) || emptyOperations(),
      input,
      actor,
    );
    tx.set(ref, next);
    return next;
  });
}
