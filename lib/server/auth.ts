import { demoMode, firebase } from './firebase';
import { roles, type Actor, type Role } from '../model';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function authenticate(req: Request): Promise<Actor> {
  if (demoMode()) {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(req.url).hostname))
      throw new HttpError(403, 'The demo is limited to localhost.');
    const role = req.headers.get('x-demo-role') || 'provider_admin';
    if (!roles.includes(role as Role)) throw new HttpError(403, 'Unknown demo role.');
    return {
      uid: `demo-${role}`,
      name: 'Sample Administrator',
      email: 'sample@example.test',
      role: role as Role,
      providerId: 'sample',
      verified: true,
    };
  }
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Sign in to continue.');
  let user;
  try {
    user = await firebase().auth.verifyIdToken(header.slice(7), true);
  } catch {
    throw new HttpError(401, 'Your session expired. Sign in again.');
  }
  if (!user.email_verified) throw new HttpError(403, 'Verify your email before accessing records.');
  const membership = await firebase().db.collection('memberships').doc(user.uid).get();
  const data = membership.data();
  if (!data?.active || !roles.includes(data.role) || !data.providerId)
    throw new HttpError(403, 'You do not have an active Care++ membership.');
  return {
    uid: user.uid,
    email: (user.email || '').toLowerCase(),
    name: user.name || user.email || 'Member',
    role: data.role,
    providerId: data.providerId,
    verified: true,
  };
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== (process.env.APP_ORIGIN || new URL(req.url).origin))
    throw new HttpError(403, 'Request origin is not allowed.');
}

export async function jsonBody(req: Request, maxBytes = 100_000) {
  if (Number(req.headers.get('content-length') || 0) > maxBytes)
    throw new HttpError(413, 'Request is too large.');
  if (!req.body) throw new HttpError(400, 'Send a JSON object.');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'Request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON request.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'Send a JSON object.');
  return body;
}
