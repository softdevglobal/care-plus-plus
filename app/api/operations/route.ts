import { authenticate, sameOrigin, jsonBody } from '@/lib/server/auth';
import { respond, fail } from '@/lib/server/http';
import { readOperations, writeOperations } from '@/lib/server/operations-store';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  try {
    const actor = await authenticate(req);
    return respond({
      state: await readOperations(actor),
      actor: { name: actor.name, role: actor.role },
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const actor = await authenticate(req);
    return respond({ state: await writeOperations(actor, await jsonBody(req, 100000)) });
  } catch (e) {
    return fail(e);
  }
}
