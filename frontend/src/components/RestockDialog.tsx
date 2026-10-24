import { type FormEvent, useState } from "react";
import { useVehiclesApi } from "../api/ApiProvider";
import { ApiError } from "../api/client";
import type { Vehicle } from "../api/types";
import { messageFor } from "../lib/errors";
import { validateRestock } from "../lib/vehicleForm";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { TextField } from "./TextField";

interface RestockDialogProps {
  vehicle: Vehicle;
  onClose: () => void;
  /** The vehicle as the server now has it. */
  onRestocked: (vehicle: Vehicle) => void;
  /** The vehicle no longer exists. */
  onGone: () => void;
}

/** Adds units to a vehicle's stock. Only increases are possible here: a negative number is refused. */
export function RestockDialog({ vehicle, onClose, onRestocked, onGone }: RestockDialogProps) {
  const api = useVehiclesApi();
  const [units, setUnits] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const checked = validateRestock(units);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }

    setFormError(undefined);
    setBusy(true);
    try {
      onRestocked(await api.restock(vehicle.id, checked.quantity));
    } catch (failure) {
      setBusy(false);
      if (failure instanceof ApiError && failure.code === "VEHICLE_NOT_FOUND") onGone();
      else setFormError(messageFor(failure));
    }
  }

  return (
    <Dialog title={`Restock ${vehicle.make} ${vehicle.model}`} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <p className="text-sm text-slate-600">Currently {vehicle.quantity} in stock.</p>
        {formError && <Alert>{formError}</Alert>}

        <TextField
          data-autofocus
          label="Units to add"
          inputMode="numeric"
          autoComplete="off"
          value={units}
          error={error}
          onChange={(event) => {
            setUnits(event.target.value);
            setError(undefined);
          }}
        />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {busy ? "Adding…" : "Add stock"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
