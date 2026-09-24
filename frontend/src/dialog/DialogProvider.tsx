import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useMemo, useState, type ReactNode } from 'react';
import { DialogContext, type DialogOptions, type Dialogs } from './DialogContext';

interface DialogRequest extends DialogOptions {
  id: number;
  message: string;
  kind: 'alert' | 'confirm';
  resolve(accepted: boolean): void;
}

let nextId = 0;

/** Shows the dialogs requested through useDialog, one at a time in request order */
export default function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0];

  const dialogs = useMemo<Dialogs>(() => {
    const request = (kind: DialogRequest['kind'], message: string, options: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        setQueue((q) => [...q, { ...options, id: nextId++, kind, message, resolve }]);
      });
    return {
      alert: (message, options) => request('alert', message, options).then(() => undefined),
      confirm: (message, options) => request('confirm', message, options),
    };
  }, []);

  const close = (accepted: boolean) => {
    if (!current) return;
    current.resolve(accepted);
    setQueue((q) => q.filter((r) => r.id !== current.id));
  };

  return (
    <DialogContext.Provider value={dialogs}>
      {children}
      <AlertDialog.Root
        key={current?.id}
        open={current !== undefined}
        // Cancel, Escape and the Action button all close the dialog; Action resolves first with true
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          {current ? (
            <AlertDialog.Content className="dialog-content">
              <AlertDialog.Title className="dialog-title">{current.title}</AlertDialog.Title>
              <AlertDialog.Description className="dialog-message">{current.message}</AlertDialog.Description>
              <div className="dialog-buttons">
                {current.kind === 'confirm' ? (
                  <AlertDialog.Cancel className="dialog-button">{current.cancelLabel ?? 'Cancel'}</AlertDialog.Cancel>
                ) : null}
                <AlertDialog.Action className="dialog-button dialog-button-primary" onClick={() => close(true)}>
                  {current.confirmLabel ?? 'OK'}
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          ) : null}
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </DialogContext.Provider>
  );
}
