import type { APIRoute } from 'astro';

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function errorResponse(err: unknown, status = 500): Response {
  return jsonResponse({ error: getErrorMessage(err) }, { status });
}

export function notFoundResponse(): Response {
  return new Response('Not Found', { status: 404 });
}

export function requireDev(handler: APIRoute): APIRoute {
  return async (ctx) => {
    if (!import.meta.env.DEV) return notFoundResponse();
    return handler(ctx);
  };
}
