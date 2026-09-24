import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api/client';
import DialogProvider from '../dialog/DialogProvider';
import HomePage from './HomePage';

vi.mock('../api/client', () => ({
  getGameList: vi.fn(),
  createGame: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(api.getGameList).mockResolvedValue(['friday', 'party']);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('game list', () => {
  test('links each public game to its view page', async () => {
    render(<HomePage />, { wrapper: DialogProvider });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'friday' })).toHaveAttribute('href', '/view/friday');
  });

  test('says when there is no game, including when the list cannot be loaded', async () => {
    vi.mocked(api.getGameList).mockRejectedValue(new Error('down'));
    render(<HomePage />, { wrapper: DialogProvider });
    expect(await screen.findByText('No game found')).toBeInTheDocument();
  });
});

describe('create game', () => {
  const nameInput = () => screen.getByPlaceholderText(/Game ID/);
  const createButton = () => screen.getByRole('button', { name: 'Create!' });

  test('keeps only word characters in the name', async () => {
    render(<HomePage />, { wrapper: DialogProvider });
    expect(createButton()).toBeDisabled();
    await userEvent.type(nameInput(), 'my game-1!');
    expect(nameInput()).toHaveValue('mygame1');
  });

  test('shows the control code and resets the form', async () => {
    vi.mocked(api.createGame).mockResolvedValue({ success: true, code: 'abc123' });
    render(<HomePage />, { wrapper: DialogProvider });

    await userEvent.type(nameInput(), 'friday');
    await userEvent.click(screen.getByLabelText(/Public game/));
    await userEvent.click(createButton());

    expect(api.createGame).toHaveBeenCalledWith({ gameId: 'friday', isPublic: false });
    const dialog = screen.getByRole('alertdialog', { name: 'Game created, code abc123' });
    expect(dialog).toHaveTextContent(`${window.location.origin}/control/friday/abc123`);
    expect(nameInput()).toHaveValue('');
    expect(screen.getByLabelText(/Public game/)).toBeChecked();
  });

  test('shows why a game could not be created', async () => {
    vi.mocked(api.createGame).mockResolvedValue({ success: false, error: 'duplicate' });
    render(<HomePage />, { wrapper: DialogProvider });
    await userEvent.type(nameInput(), 'friday');
    await userEvent.click(createButton());
    expect(await screen.findByText(/name may already be taken/)).toBeInTheDocument();

    vi.mocked(api.createGame).mockRejectedValue(new Error('offline'));
    await userEvent.click(createButton());
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
  });
});
