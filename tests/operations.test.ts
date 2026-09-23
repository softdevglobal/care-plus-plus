import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  seedOperations,
  validateValues,
  validateRelations,
  shiftHours,
  invoiceTotals,
  csvCell,
  isoDate,
  addDays,
  modules,
} from '../lib/operations';
import { applyOperationsCommand } from '../lib/server/operations-store';
import { GET, POST } from '../app/api/operations/route';
import type { Actor } from '../lib/model';
const actor: Actor = {
  uid: 'test',
  providerId: 'horizon',
  name: 'Test manager',
  email: 'manager@example.test',
  role: 'provider_admin',
  verified: true,
};
let temporary = '';
before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'careplus-operations-test-'));
  Object.assign(process.env, {
    NODE_ENV: 'development',
    APP_MODE: 'demo',
    DEMO_DATA_DIR: temporary,
  });
});
after(async () => {
  const resolved = path.resolve(temporary);
  if (
    resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
    path.basename(resolved).startsWith('careplus-operations-test-')
  )
    await rm(resolved, { recursive: true, force: true });
});
test('sample records satisfy the field schemas for all populated modules', () => {
  const state = seedOperations();
  for (const r of state.records) {
    const values = Object.fromEntries(
      modules.find((m) => m.id === r.module)!.fields.map((f) => [f.key, r[f.key]]),
    );
    assert.doesNotThrow(() => validateValues(r.module, values));
  }
  assert.ok(state.records.length >= 15);
});
test('overnight time and unpaid breaks are calculated correctly', () => {
  assert.equal(shiftHours({ start: '22:00', end: '06:00', breakMinutes: 30 }), 7.5);
  assert.equal(shiftHours({ start: '09:00', end: '13:00', breakMinutes: 0 }), 4);
  assert.throws(
    () =>
      validateValues('shifts', {
        title: 'Test shift',
        date: isoDate(),
        start: '09:00',
        end: '10:00',
        breakMinutes: 60,
      }),
    /break/,
  );
});
test('money rounds to cents and partial payments retain the right balance', () => {
  assert.deepEqual(invoiceTotals({ quantity: 3, rate: 10.01, taxRate: 10, paid: 10 }), {
    subtotal: 30.03,
    tax: 3,
    amount: 33.03,
    balance: 23.03,
  });
  assert.throws(
    () =>
      validateValues('invoices', {
        clientId: 'x',
        date: isoDate(),
        due: isoDate(),
        description: 'Support',
        quantity: 1,
        rate: 100,
        paid: 101,
      }),
    /exceeds/,
  );
  assert.throws(
    () =>
      validateValues('invoices', {
        clientId: 'x',
        date: isoDate(),
        due: isoDate(),
        description: 'Support',
        quantity: 1,
        rate: 100,
        paid: 10,
        status: 'Paid',
      }),
    /full payment/,
  );
});
test('overnight shifts conflict across calendar days', () => {
  const state = seedOperations();
  const prior = {
    ...state.records.find((r) => r.module === 'shifts')!,
    date: '2026-10-01',
    start: '22:00',
    end: '06:00',
    staffId: 'staff-sarah',
  };
  const values = validateValues('shifts', {
    title: 'Overlap',
    date: '2026-10-02',
    start: '05:00',
    end: '09:00',
    staffId: 'staff-sarah',
  });
  assert.throws(
    () =>
      validateRelations('shifts', values, [
        ...state.records.filter((r) => r.module !== 'shifts'),
        prior,
      ]),
    /overlapping/,
  );
});
test('archived and missing relationships cannot be used to create new records', () => {
  const state = seedOperations();
  state.records.find((r) => r.id === 'client-alex')!.archived = true;
  assert.throws(
    () => validateRelations('notes', { clientId: 'client-alex' }, state.records),
    /available/,
  );
  assert.throws(
    () => validateRelations('notes', { clientId: 'another-provider' }, state.records),
    /available/,
  );
});
test('invalid values, dates, unknown fields and premature resolution are rejected', () => {
  assert.throws(
    () => validateValues('complaints', { title: 'Test', date: '2026-02-30', category: 'Other' }),
    /invalid date/,
  );
  assert.throws(
    () =>
      validateValues('complaints', {
        title: 'Test',
        date: isoDate(),
        category: 'Other',
        status: 'Resolved',
      }),
    /resolution/,
  );
  assert.throws(
    () => validateValues('staff', { name: 'Test', email: 'x', providerId: 'forged' }),
    /Unknown field/,
  );
});
test('CSV export neutralizes spreadsheet formulas and quotes values', () => {
  assert.equal(csvCell('=1+2'), '"\'=1+2"');
  assert.equal(csvCell('a"b'), '"a""b"');
});
test('source shift invoices cannot be duplicated, including when the first invoice is archived', () => {
  const state = seedOperations();
  const values = {
    clientId: 'client-alex',
    shiftId: 'shift-0',
    date: isoDate(),
    due: addDays(isoDate(), 14),
    description: 'Completed support',
    quantity: 4,
    rate: 65,
  };
  const saved = applyOperationsCommand(
    state,
    { action: 'save', revision: 0, module: 'invoices', values },
    actor,
  );
  assert.equal(saved.records.at(-1)!.amount, 260);
  assert.throws(
    () =>
      applyOperationsCommand(
        saved,
        { action: 'save', revision: 1, module: 'invoices', values },
        actor,
      ),
    /already/,
  );
  const archived = applyOperationsCommand(
    saved,
    { action: 'archive', revision: 1, module: 'invoices', id: saved.records.at(-1)!.id },
    actor,
  );
  assert.throws(
    () =>
      applyOperationsCommand(
        archived,
        { action: 'save', revision: 2, module: 'invoices', values },
        actor,
      ),
    /already/,
  );
});
test('commands record attribution, reject stale edits and support archive/restore', () => {
  const state = seedOperations();
  const created = applyOperationsCommand(
    state,
    {
      action: 'save',
      revision: 0,
      module: 'complaints',
      values: { title: 'Test concern', date: isoDate(), category: 'Other' },
    },
    actor,
  );
  const row = created.records.at(-1)!;
  assert.equal(created.revision, 1);
  assert.equal(row.createdBy, actor.name);
  assert.equal(created.events[0].recordId, row.id);
  assert.throws(
    () =>
      applyOperationsCommand(
        created,
        { action: 'archive', module: 'complaints', id: row.id, revision: 0 },
        actor,
      ),
    /another window/,
  );
  const archived = applyOperationsCommand(
    created,
    { action: 'archive', module: 'complaints', id: row.id, revision: 1 },
    actor,
  );
  assert.equal(archived.records.at(-1)!.archived, true);
  const restored = applyOperationsCommand(
    archived,
    { action: 'restore', module: 'complaints', id: row.id, revision: 2 },
    actor,
  );
  assert.equal(restored.records.at(-1)!.archived, false);
});
test('staff, participants, and platform administrators cannot access manager operations', async () => {
  for (const role of ['staff', 'participant', 'super_admin']) {
    const response = await GET(
      new Request('http://localhost/api/operations', { headers: { 'x-demo-role': role } }),
    );
    assert.equal(response.status, 403);
  }
});
test('API persists records and rejects cross-origin writes and stale revisions', async () => {
  const first = await GET(new Request('http://localhost/api/operations'));
  assert.equal(first.status, 200);
  const data = await first.json();
  const body = {
    action: 'save',
    revision: data.state.revision,
    module: 'actions',
    values: { title: 'Persisted action', due: addDays(isoDate(), 1) },
  };
  const request = (origin: string) =>
    new Request('http://localhost/api/operations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify(body),
    });
  const denied = await POST(request('https://untrusted.example'));
  assert.equal(denied.status, 403);
  const saved = await POST(request(process.env.APP_ORIGIN || 'http://localhost'));
  assert.equal(saved.status, 200);
  const again = await POST(request(process.env.APP_ORIGIN || 'http://localhost'));
  assert.equal(again.status, 409);
  const read = await (await GET(new Request('http://localhost/api/operations'))).json();
  assert.ok(read.state.records.some((r: { title: string }) => r.title === 'Persisted action'));
});
