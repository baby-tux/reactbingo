import { createContext, useContext } from 'react';

export interface DialogOptions {
  title: string;
  /** Label of the button that closes an alert or accepts a confirm (default "OK") */
  confirmLabel?: string;
  /** Label of the button that refuses a confirm (default "Cancel") */
  cancelLabel?: string;
}

export interface Dialogs {
  /** Shows a message; resolves once it is dismissed */
  alert(message: string, options: DialogOptions): Promise<void>;
  /** Asks a yes/no question; resolves to true when accepted, false when refused or dismissed */
  confirm(message: string, options: DialogOptions): Promise<boolean>;
}

export const DialogContext = createContext<Dialogs | null>(null);

/** In-page replacements for window.alert and window.confirm (needs a DialogProvider above) */
export function useDialog(): Dialogs {
  const dialogs = useContext(DialogContext);
  if (!dialogs) throw new Error('useDialog must be used inside a DialogProvider');
  return dialogs;
}
