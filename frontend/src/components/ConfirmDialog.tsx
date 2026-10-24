import { Alert } from "./Alert";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** The confirm button's text while the action runs. */
  busyLabel: string;
  busy: boolean;
  /** Why the action failed, if it did; the dialog stays open so it can be tried again. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before something that cannot be undone. The cursor starts on Cancel, so a stray Enter does no harm. */
export function ConfirmDialog({ title, message, confirmLabel, busyLabel, busy, error, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog title={title} onClose={busy ? () => undefined : onCancel}>
      <div className="mt-3 space-y-4">
        <p className="text-sm text-slate-600">{message}</p>
        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button data-autofocus variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
