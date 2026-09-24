import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createGame, getGameList, getPatterns, validateCard } from './client';

const fetchMock = vi.fn();
const respond = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('api client', () => {
  test('GET requests go through /api/', async () => {
    respond({ games: ['a', 'b'] });
    await expect(getGameList()).resolves.toEqual(['a', 'b']);
    expect(fetchMock).toHaveBeenCalledWith('/api/list', undefined);

    respond([['row']]);
    await expect(getPatterns()).resolves.toEqual([['row']]);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/types', undefined);
  });

  test('POST requests send JSON', async () => {
    respond({ success: true, code: 'abc' });
    await expect(createGame({ gameId: 'g', isPublic: true })).resolves.toEqual({ success: true, code: 'abc' });
    expect(fetchMock).toHaveBeenCalledWith('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: 'g', isPublic: true }),
    });

    respond({ isValid: false });
    await expect(validateCard({ cardNumber: '9', numbers: [1], patterns: ['row'] })).resolves.toEqual({
      isValid: false,
    });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/validate', expect.objectContaining({ method: 'POST' }));
  });

  test('rejects on HTTP errors', async () => {
    respond({ games: [], error: 'db' }, 400);
    await expect(getGameList()).rejects.toThrow('GET list failed: 400');
  });
});
