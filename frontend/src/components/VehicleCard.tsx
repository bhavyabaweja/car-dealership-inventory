import { PackagePlus, Pencil, Trash2 } from "lucide-react";
import { useId } from "react";
import type { Vehicle } from "../api/types";
import { formatPrice } from "../lib/money";
import { vehicleCode } from "../lib/vehicleCode";
import { illustrationFor } from "../lib/vehicleIllustration";
import { Button } from "./Button";

/** At or below this many units a vehicle is flagged as running low. */
const LOW_STOCK_THRESHOLD = 3;

function StockBadge({ quantity }: { quantity: number }) {
  const [text, tone, dot] =
    quantity === 0
      ? ["Sold out", "bg-rose-950/90 border-rose-500/40 text-rose-300", "bg-rose-400"]
      : quantity <= LOW_STOCK_THRESHOLD
        ? [`Only ${quantity} left`, "bg-amber-950/80 border-amber-500/30 text-amber-400", "bg-amber-400"]
        : [`${quantity} in stock`, "bg-emerald-950/80 border-emerald-500/30 text-emerald-400", "bg-emerald-400"];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md ${tone}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot} ${quantity > 0 ? "animate-pulse motion-reduce:animate-none" : ""}`} />
      {text}
    </span>
  );
}

// The card is a container, so these follow the room the card has, not the width of the screen: four cards across a
// wide screen are as narrow as one on a phone. Each of the three buttons needs about 94px to hold an icon and "Restock".
const adminButton = "px-2 @min-[340px]:px-3";
const adminIcon = "hidden size-4 @min-[340px]:block";

/** What an administrator can do to a vehicle. Passed only to administrators, so a customer's card never has them. */
export interface AdminActions {
  onEdit: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  /** Without it the card offers no Purchase button, as on an administrator's dashboard. */
  onPurchase?: (vehicle: Vehicle) => void;
  /** A purchase of this vehicle is in progress. */
  purchasing: boolean;
  admin?: AdminActions;
}

export function VehicleCard({ vehicle, onPurchase, purchasing, admin }: VehicleCardProps) {
  const titleId = useId();
  const name = `${vehicle.make} ${vehicle.model}`;
  const soldOut = vehicle.quantity === 0;
  const low = !soldOut && vehicle.quantity <= LOW_STOCK_THRESHOLD;
  const { src } = illustrationFor(vehicle.category);

  return (
    <article
      aria-labelledby={titleId}
      className={
        "group @container flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/7 bg-surface-container transition-all duration-300 " +
        "hover:-translate-y-0.5 hover:border-primary-container/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0 " +
        (soldOut ? "opacity-80" : "")
      }
    >
      <div>
        {/* The database holds no photographs, so this is a drawing of the kind of car, and says so. */}
        <div className="relative h-56 w-full overflow-hidden bg-surface-container-low">
          <img
            src={src}
            alt=""
            loading="lazy"
            className={`size-full object-contain px-6 pt-8 pb-4 transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <StockBadge quantity={vehicle.quantity} />
          </div>
          <span className="absolute top-3 right-3 max-w-[45%] truncate rounded-lg border border-white/8 bg-background/80 px-2.5 py-1 text-xs font-medium text-slate-300 backdrop-blur-md">
            {vehicle.category}
          </span>
          <span aria-hidden="true" className="absolute right-3 bottom-2 text-[10px] font-semibold tracking-wider text-outline uppercase">
            Illustrative image
          </span>
        </div>

        <div className="p-5">
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-outline uppercase">
            ID: <span className="font-mono">{vehicleCode(vehicle.id)}</span>
          </p>
          <h3 id={titleId} className={`font-display text-xl font-bold break-words ${soldOut ? "text-slate-300" : "text-white"}`}>
            {name}
          </h3>
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold text-outline uppercase">Price</span>
            <span className={`font-display text-2xl font-bold tabular-nums ${soldOut ? "text-slate-400 line-through" : "text-white"}`}>
              {formatPrice(vehicle.price)}
            </span>
          </div>
          <span className={`text-xs ${soldOut ? "font-medium text-rose-400" : low ? "font-medium text-amber-400" : "text-outline"}`}>
            Available: {vehicle.quantity}
          </span>
        </div>

        <div className="space-y-2">
          {onPurchase && (
            <Button
              className={`w-full rounded-xl py-3 ${soldOut ? "bg-slate-800! font-semibold! text-slate-500! opacity-100! shadow-none!" : ""}`}
              disabled={soldOut}
              loading={purchasing}
              aria-label={soldOut ? `Purchase ${name}, out of stock` : `Purchase ${name}`}
              onClick={() => onPurchase(vehicle)}
            >
              {purchasing ? "Buying…" : soldOut ? "Out of stock" : "Purchase"}
            </Button>
          )}

          {admin && (
            // Three buttons share the row. On narrow cards there is no room for an icon beside "Restock" as well,
            // and the words say it all, so the icons wait for width.
            <div className="grid grid-cols-3 gap-2">
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
      </div>
    </article>
  );
}

/** A placeholder with the card's shape, shown while the list loads. */
export function VehicleCardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4 overflow-hidden rounded-2xl border border-white/8 bg-surface-container p-5">
      <div className="skeleton-shimmer h-52 w-full rounded-xl" />
      <div className="skeleton-shimmer h-4 w-24 rounded" />
      <div className="skeleton-shimmer h-6 w-3/4 rounded" />
      <div className="skeleton-shimmer h-8 w-1/2 rounded" />
      <div className="skeleton-shimmer h-12 w-full rounded-xl" />
    </div>
  );
}
