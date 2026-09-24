import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import Board from './Board';
import CardNumberInput from './CardNumberInput';
import ConnectionStatus from './ConnectionStatus';
import LastNumbers from './LastNumbers';
import PatternPicker from './PatternPicker';

describe('Board', () => {
  test('shows 75 numbers, disables drawn ones and highlights the last', async () => {
    const onNumberClick = vi.fn();
    render(<Board pickedNumbers={[5, 20]} viewMode={false} onNumberClick={onNumberClick} />);

    expect(screen.getAllByRole('button')).toHaveLength(75);
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '20' })).toHaveClass('board-number-active');

    await userEvent.click(screen.getByRole('button', { name: '42' }));
    expect(onNumberClick).toHaveBeenCalledWith(42);
  });
});

describe('LastNumbers', () => {
  test('shows the current number and the four previous ones, most recent first', () => {
    const { container } = render(<LastNumbers numbers={[1, 16, 31, 46, 61, 75]} />);
    expect(container.querySelector('.current-number')).toHaveTextContent('O 75');
    expect(container.querySelector('.previous-numbers')).toHaveTextContent('O 61G 46N 31I 16');
  });
});

describe('CardNumberInput', () => {
  test('types with the keypad, clears and validates', async () => {
    const onValidate = vi.fn();
    render(<CardNumberInput onValidate={onValidate} />);
    const input = screen.getByRole('textbox');

    await userEvent.click(screen.getByRole('button', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(input).toHaveValue('42');

    await userEvent.click(screen.getByRole('button', { name: '✔' }));
    expect(onValidate).toHaveBeenLastCalledWith('42');

    await userEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(input).toHaveValue('');
  });

  test('validates on Enter', async () => {
    const onValidate = vi.fn();
    render(<CardNumberInput onValidate={onValidate} />);
    await userEvent.type(screen.getByRole('textbox'), '17{Enter}');
    expect(onValidate).toHaveBeenCalledWith('17');
  });
});

describe('PatternPicker', () => {
  const defaults = {
    lines: [['row', 'column', 'diag']],
    enabled: true,
    validated: [],
    highlighted: [],
    current: [],
    continueAvailable: false,
    onAward: vi.fn(),
    onCancel: vi.fn(),
  };
  const pattern = (name: string) => screen.getByRole('button', { name });
  const confirm = () => screen.getByRole('button', { name: '✔' });

  test('awards the manually selected patterns', async () => {
    const onAward = vi.fn();
    render(<PatternPicker {...defaults} onAward={onAward} />);
    expect(confirm()).toBeDisabled();

    await userEvent.click(pattern('row'));
    await userEvent.click(pattern('diag'));
    await userEvent.click(pattern('row'));
    expect(pattern('diag')).toHaveClass('bingoTypeSelected');

    await userEvent.click(confirm());
    expect(onAward).toHaveBeenCalledWith(['diag'], false);
    expect(pattern('diag')).not.toHaveClass('bingoTypeSelected');
  });

  test('awards the patterns matched by the card, and can continue with another bingo', async () => {
    const onAward = vi.fn();
    render(<PatternPicker {...defaults} highlighted={['column']} continueAvailable onAward={onAward} />);

    await userEvent.click(pattern('row'));
    expect(pattern('row')).not.toHaveClass('bingoTypeSelected');

    await userEvent.click(screen.getByRole('button', { name: 'Other bingo' }));
    expect(onAward).toHaveBeenCalledWith(['column'], true);
  });

  test('cannot select patterns outside bingo mode or already won', async () => {
    render(<PatternPicker {...defaults} enabled={false} validated={['column']} current={['diag']} />);
    await userEvent.click(pattern('row'));
    expect(pattern('row')).not.toHaveClass('bingoTypeSelected');
    expect(pattern('column')).toBeDisabled();
    expect(pattern('diag')).toHaveClass('bingoTypeCurrent');
  });

  test('cancel clears the selection', async () => {
    const onCancel = vi.fn();
    render(<PatternPicker {...defaults} onCancel={onCancel} />);
    await userEvent.click(pattern('row'));
    await userEvent.click(screen.getByRole('button', { name: '✖' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(pattern('row')).not.toHaveClass('bingoTypeSelected');
  });
});

describe('ConnectionStatus', () => {
  const props = { syncError: null, viewMode: false, onReconnect: () => {} };

  test('is hidden while connected', () => {
    const { container } = render(<ConnectionStatus {...props} connection="open" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('offers to reconnect when disconnected', async () => {
    const onReconnect = vi.fn();
    render(<ConnectionStatus {...props} connection="closed" onReconnect={onReconnect} />);
    expect(screen.getByText(/Changes will sync when reconnected/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(onReconnect).toHaveBeenCalledOnce();
  });

  test('flags an invalid control code over everything else', () => {
    render(<ConnectionStatus {...props} connection="closed" syncError="unauthorized" />);
    expect(screen.getByText(/Invalid control code/)).toBeInTheDocument();
  });
});
