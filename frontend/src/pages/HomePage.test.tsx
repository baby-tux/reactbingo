import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as api from '../api/client';
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
    render(<HomePage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'friday' })).toHaveAttribute('href', '/view/friday');
  });

  test('says when there is no game, including when the list cannot be loaded', async () => {
    vi.mocked(api.getGameList).mockRejectedValue(new Error('down'));
    render(<HomePage />);
    expect(await screen.findByText('No game found')).toBeInTheDocument();
  });
});

describe('create game', () => {
  const nameInput = () => screen.getByPlaceholderText(/Game ID/);
  const createButton = () => screen.getByRole('button', { name: 'Create!' });

  test('keeps only word characters in the name', async () => {
    render(<HomePage />);
    expect(createButton()).toBeDisabled();
    await userEvent.type(nameInput(), 'my game-1!');
    expect(nameInput()).toHaveValue('mygame1');
  });

  test('shows the control code and resets the form', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.createGame).mockResolvedValue({ success: true, code: 'abc123' });
    render(<HomePage />);

    await userEvent.type(nameInput(), 'friday');
    await userEvent.click(screen.getByLabelText(/Public game/));
    await userEvent.click(createButton());

    expect(api.createGame).toHaveBeenCalledWith({ gameId: 'friday', isPublic: false });
    expect(alert).toHaveBeenCalledWith('Success! Code is: abc123');
    expect(nameInput()).toHaveValue('');
    expect(screen.getByLabelText(/Public game/)).toBeChecked();
  });

  test('shows why a game could not be created', async () => {
    vi.mocked(api.createGame).mockResolvedValue({ success: false, error: 'duplicate' });
    render(<HomePage />);
    await userEvent.type(nameInput(), 'friday');
    await userEvent.click(createButton());
    expect(await screen.findByText(/name may already be taken/)).toBeInTheDocument();

    vi.mocked(api.createGame).mockRejectedValue(new Error('offline'));
    await userEvent.click(createButton());
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
  });
});
