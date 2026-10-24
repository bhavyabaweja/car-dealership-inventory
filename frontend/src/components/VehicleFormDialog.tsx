import { type FormEvent, useRef, useState } from "react";
import { useVehiclesApi } from "../api/ApiProvider";
import { ApiError } from "../api/client";
import type { NewVehicle, Vehicle } from "../api/types";
import { config } from "../config";
import { messageFor } from "../lib/errors";
import { changedFields, validateVehicleForm, type VehicleFormErrors, type VehicleFormValues } from "../lib/vehicleForm";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { TextField } from "./TextField";

interface VehicleFormDialogProps {
  /** The vehicle to edit; without one the dialog adds a new vehicle. */
  vehicle?: Vehicle;
  onClose: () => void;
  onSaved: (vehicle: Vehicle) => void;
  /** An edit found that the vehicle no longer exists. */
  onGone: () => void;
}

const FIELDS = ["make", "model", "category", "price", "quantity"] as const;

function startingValues(vehicle?: Vehicle): VehicleFormValues {
  return {
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    category: vehicle?.category ?? "",
    price: vehicle?.price ?? "",
    quantity: "",
  };
}

/** Adds a vehicle, or edits one. Stock is set when adding; afterwards it changes only through Restock and purchases. */
export function VehicleFormDialog({ vehicle, onClose, onSaved, onGone }: VehicleFormDialogProps) {
  const api = useVehiclesApi();
  const editing = vehicle !== undefined;
  const [values, setValues] = useState(() => startingValues(vehicle));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const inputs = {
    make: useRef<HTMLInputElement>(null),
    model: useRef<HTMLInputElement>(null),
    category: useRef<HTMLInputElement>(null),
    price: useRef<HTMLInputElement>(null),
    quantity: useRef<HTMLInputElement>(null),
  };

  /** Shows the problems and puts the cursor on the first field that has one. */
  function showErrors(next: VehicleFormErrors) {
    setErrors(next);
    const first = FIELDS.find((field) => next[field]);
    if (first) inputs[first].current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const { errors: found, data } = validateVehicleForm(values, { withQuantity: !editing });
    if (!data) {
      showErrors(found);
      return;
    }

    setFormError(undefined);
    setBusy(true);
    try {
      if (vehicle) {
        const changes = changedFields(vehicle, data);
        if (Object.keys(changes).length === 0) {
          onClose(); // nothing to save
          return;
        }
        onSaved(await api.update(vehicle.id, changes));
      } else {
        onSaved(await api.create(data as NewVehicle));
      }
    } catch (failure) {
      setBusy(false);
      if (failure instanceof ApiError && failure.code === "VEHICLE_NOT_FOUND") {
        onGone();
      } else if (failure instanceof ApiError && failure.code === "VALIDATION_ERROR" && failure.details.length > 0) {
        const fromServer: VehicleFormErrors = {};
        for (const { field, message } of failure.details) {
          if ((FIELDS as readonly string[]).includes(field)) fromServer[field as keyof VehicleFormValues] ??= message;
        }
        if (Object.keys(fromServer).length > 0) showErrors(fromServer);
        else setFormError(failure.message);
      } else {
        setFormError(messageFor(failure));
      }
    }
  }

  /** Editing a field clears whatever was said about it, so a stale message never lingers. */
  function edit(field: keyof VehicleFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const field = (name: keyof VehicleFormValues) => ({
    ref: inputs[name],
    value: values[name],
    error: errors[name],
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) => edit(name, event.target.value),
  });

  return (
    <Dialog title={vehicle ? `Edit ${vehicle.make} ${vehicle.model}` : "Add a vehicle"} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Make" {...field("make")} />
          <TextField label="Model" {...field("model")} />
        </div>
        <TextField label="Category" {...field("category")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={`Price (${config.currency})`} inputMode="decimal" {...field("price")} />
          {!editing && <TextField label="Quantity in stock" inputMode="numeric" {...field("quantity")} />}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add vehicle"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
