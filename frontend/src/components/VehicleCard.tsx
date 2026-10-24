import { PackagePlus, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { useId } from "react";
import type { Vehicle } from "../api/types";
import { formatPrice } from "../lib/money";
import { Button } from "./Button";

/** At or below this many units a vehicle is flagged as running low. */
const LOW_STOCK_THRESHOLD = 3;

function StockBadge({ quantity }: { quantity: number }) {
  const [text, tone] =
    quantity === 0
      ? ["Sold out", "bg-slate-100 text-slate-600 ring-slate-500/20"]
      : quantity <= LOW_STOCK_THRESHOLD
        ? [`Only ${quantity} left`, "bg-amber-50 text-amber-800 ring-amber-600/20"]
        : [`${quantity} in stock`, "bg-emerald-50 text-emerald-800 ring-emerald-600/20"];

  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}>{text}</span>;
}

const adminButton = "px-2 sm:px-3";
const adminIcon = "hidden size-4 min-[420px]:block";

/** What an administrator can do to a vehicle. Passed only to administrators, so a customer's card never has them. */
export interface AdminActions {
  onEdit: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onPurchase: (vehicle: Vehicle) => void;
  /** A purchase of this vehicle is in progress. */
  purchasing: boolean;
  admin?: AdminActions;
}

export function VehicleCard({ vehicle, onPurchase, purchasing, admin }: VehicleCardProps) {
  const titleId = useId();
  const name = `${vehicle.make} ${vehicle.model}`;

  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight break-words text-slate-900">
            {name}
          </h2>
          <p className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {vehicle.category}
          </p>
        </div>
        <StockBadge quantity={vehicle.quantity} />
      </div>

      <p className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{formatPrice(vehicle.price)}</p>

      {/* mt-auto keeps the buttons in a row across cards whatever the title length. */}
      <div className="mt-auto pt-5">
        <Button
          className="w-full"
          disabled={vehicle.quantity === 0}
          loading={purchasing}
          aria-label={`Purchase ${name}`}
          onClick={() => onPurchase(vehicle)}
        >
          {purchasing ? (
            "Buying…"
          ) : (
            <>
              <ShoppingCart className="size-4" aria-hidden="true" />
              Purchase
            </>
          )}
        </Button>

        {admin && (
          // Three buttons share the row. On narrow phones there is no room for an icon beside "Restock" as well
          // (it needs 78px of a 77px button at 320px), and the words say it all, so the icons wait for width.
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" className={adminButton} aria-label={`Edit ${name}`} onClick={() => admin.onEdit(vehicle)}>
              <Pencil className={adminIcon} aria-hidden="true" />
              Edit
            </Button>
            <Button variant="secondary" size="sm" className={adminButton} aria-label={`Restock ${name}`} onClick={() => admin.onRestock(vehicle)}>
              <PackagePlus className={adminIcon} aria-hidden="true" />
              Restock
            </Button>
            <Button variant="dangerOutline" size="sm" className={adminButton} aria-label={`Delete ${name}`} onClick={() => admin.onDelete(vehicle)}>
              <Trash2 className={adminIcon} aria-hidden="true" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/** A placeholder with the card's shape, shown while the list loads. */
export function VehicleCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="h-5 w-2/3 rounded bg-slate-200" />
        <div className="mt-2.5 h-4 w-16 rounded bg-slate-100" />
        <div className="mt-6 h-8 w-32 rounded bg-slate-200" />
        <div className="mt-5 h-11 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
