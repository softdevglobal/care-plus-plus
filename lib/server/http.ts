import { ZodError } from 'zod';
import { HttpError } from './auth';

export function respond(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(error: unknown) {
  if (error instanceof HttpError) return respond({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return respond({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }, 400);
  console.error('Care++ request failed:', error instanceof Error ? error.name : 'UnknownError');
  return respond({ error: 'This request could not be completed.' }, 500);
}
