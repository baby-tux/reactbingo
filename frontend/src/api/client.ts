import type { PatternLines, ValidationResult } from '../game/types';

// nginx (production) and the Vite dev server both proxy /api to the backend
export const API_URL = '/api/';

export type CreateGameResponse = { success: true; code: string } | { success: false; error: unknown };
export type ValidateCardResponse = { isValid: false } | { isValid: true; patterns: string[]; result: ValidationResult };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + path, init);
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status}`);
  return (await response.json()) as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const createGame = (payload: { gameId: string; isPublic: boolean }) =>
  post<CreateGameResponse>('create', payload);

export const getGameList = () => request<{ games: string[] }>('list').then((r) => r.games);

export const getPatterns = () => request<PatternLines>('types');

export const validateCard = (payload: { cardNumber: string; numbers: number[]; patterns: string[] }) =>
  post<ValidateCardResponse>('validate', payload);
