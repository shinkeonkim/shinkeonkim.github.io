import { describe, expect, it } from 'vitest';
import { errorResponse, getErrorMessage, jsonResponse, notFoundResponse } from './api-utils';

describe('getErrorMessage', () => {
  it('extracts message from Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns string input directly', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('JSON-stringifies plain object', () => {
    expect(getErrorMessage({ code: 42 })).toBe('{"code":42}');
  });

  it('handles cyclic object via String() fallback', () => {
    const o: { self?: unknown } = {};
    o.self = o;
    expect(getErrorMessage(o)).toBe('[object Object]');
  });
});

describe('jsonResponse', () => {
  it('returns JSON with content-type header', async () => {
    const res = jsonResponse({ ok: true });
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ ok: true });
  });

  it('respects status from init', () => {
    const res = jsonResponse({ ok: false }, { status: 422 });
    expect(res.status).toBe(422);
  });
});

describe('errorResponse', () => {
  it('returns { error } body with default status 500', async () => {
    const res = errorResponse(new Error('bad'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'bad' });
  });

  it('allows status override', () => {
    const res = errorResponse('nope', 400);
    expect(res.status).toBe(400);
  });
});

describe('notFoundResponse', () => {
  it('returns 404 body', async () => {
    const res = notFoundResponse();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not Found');
  });
});
