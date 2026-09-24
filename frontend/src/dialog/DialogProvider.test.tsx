import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { useDialog, type Dialogs } from './DialogContext';
import DialogProvider from './DialogProvider';

function renderDialogs(): Dialogs {
  let dialogs: Dialogs | null = null;
  function Capture() {
    dialogs = useDialog();
    return null;
  }
  render(<Capture />, { wrapper: DialogProvider });
  if (!dialogs) throw new Error('Dialogs not captured');
  return dialogs;
}

test('alert shows the message and resolves when dismissed', async () => {
  const dialogs = renderDialogs();
  let dismissed = false;
  act(() => void dialogs.alert('Card 12 is valid', { title: 'Checked' }).then(() => (dismissed = true)));

  const dialog = screen.getByRole('alertdialog', { name: 'Checked' });
  expect(dialog).toHaveTextContent('Card 12 is valid');
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(dismissed).toBe(true);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

test('confirm resolves to the chosen answer, and Escape refuses', async () => {
  const dialogs = renderDialogs();
  const answers: boolean[] = [];
  const ask = () =>
    act(() => void dialogs.confirm('Sure?', { title: 'Question', confirmLabel: 'Yes' }).then((a) => answers.push(a)));

  ask();
  await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
  ask();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  ask();
  await userEvent.keyboard('{Escape}');

  expect(answers).toEqual([true, false, false]);
});

test('dialogs requested together are shown one at a time, in order', async () => {
  const dialogs = renderDialogs();
  act(() => {
    void dialogs.alert('first', { title: 'One' });
    void dialogs.alert('second', { title: 'Two' });
  });

  expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
  expect(screen.getByRole('alertdialog', { name: 'One' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(screen.getByRole('alertdialog', { name: 'Two' })).toBeInTheDocument();
});

test('useDialog outside a provider fails clearly', () => {
  function Orphan() {
    useDialog();
    return null;
  }
  expect(() => render(<Orphan />)).toThrow('useDialog must be used inside a DialogProvider');
});
