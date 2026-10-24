import { BadgeCheck } from "lucide-react";
import type { Vehicle } from "../api/types";
import { formatPrice } from "../lib/money";
import { vehicleCode } from "../lib/vehicleCode";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface PurchaseDialogProps {
  vehicle: Vehicle;
  busy: boolean;
  /** Why the order failed, if it did; the dialog stays open so it can be tried again. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** The order summary shown before anything is bought. It starts on Cancel, so a stray Enter places no order. */
export function PurchaseDialog({ vehicle, busy, error, onConfirm, onCancel }: PurchaseDialogProps) {
  return (
    <Dialog title="Confirm purchase" onClose={busy ? () => undefined : onCancel}>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-primary-container uppercase">
        <BadgeCheck className="size-4" aria-hidden="true" />
        Review your order
      </p>
      <p className="mt-2 text-sm text-on-surface-variant">Check the vehicle below before you place the order. One unit is bought.</p>

      <dl className="mt-5 space-y-3 rounded-xl bg-surface-container-low p-4 ring-1 ring-white/8">
        <Row term="Vehicle ID" detail={<span className="font-mono text-xs font-semibold text-on-surface">{vehicleCode(vehicle.id)}</span>} />
        <Row term="Make & model" detail={<span className="text-sm font-semibold text-white">{`${vehicle.make} ${vehicle.model}`}</span>} />
        <Row term="Availability" detail={<span className="text-xs font-medium text-emerald-400">{`${vehicle.quantity} in stock`}</span>} />
        <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-3">
          <dt className="text-xs font-semibold text-on-surface-variant">Total price</dt>
          <dd className="font-display text-xl font-bold text-primary-container tabular-nums">{formatPrice(vehicle.price)}</dd>
        </div>
      </dl>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button data-autofocus variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button loading={busy} onClick={onConfirm}>
          {busy ? "Buying…" : "Confirm order"}
        </Button>
      </div>
    </Dialog>
  );
}

function Row({ term, detail }: { term: string; detail: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-on-surface-variant">{term}</dt>
      <dd className="min-w-0 text-right">{detail}</dd>
    </div>
  );
}
