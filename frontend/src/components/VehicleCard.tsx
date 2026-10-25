import { LogIn, PackagePlus, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router";
import type { Vehicle } from "../api/types";
import { illustrationFor } from "../lib/vehicleIllustration";
import { formatPrice } from "../lib/money";
import { Button } from "./Button";

/** At or below this many units a vehicle is flagged as running low. */
const LOW_STOCK_THRESHOLD = 3;

function StockBadge({ quantity }: { quantity: number }) {
  const [text, tone, dot] =
    quantity === 0
      ? ["Sold out", "bg-red-950/80 text-red-300 ring-red-400/25", "bg-red-400"]
      : quantity <= LOW_STOCK_THRESHOLD
        ? [`Only ${quantity} left`, "bg-amber-950/80 text-amber-300 ring-amber-400/25", "bg-amber-400"]
        : [`${quantity} in stock`, "bg-emerald-950/80 text-emerald-300 ring-emerald-400/25", "bg-emerald-400"];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase ring-1 ring-inset backdrop-blur-md ${tone}`}
    >
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
  /** For a visitor who has not signed in: instead of Purchase, a link to log in first. A sold-out vehicle offers neither. */
  loginToBuy?: { to: string; state?: unknown };
}

/** The look of the primary button, for a link that does what a button would. */
const linkButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-all " +
  "bg-primary-container font-display font-bold text-on-primary-container hover:bg-primary hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

export function VehicleCard({ vehicle, onPurchase, purchasing, admin, loginToBuy }: VehicleCardProps) {
  const titleId = useId();
  const name = `${vehicle.make} ${vehicle.model}`;
  const soldOut = vehicle.quantity === 0;
  const { src } = illustrationFor(vehicle.category);

  return (
    <article
      aria-labelledby={titleId}
      className="group @container flex h-full flex-col overflow-hidden rounded-xl bg-surface-container shadow-md ring-1 ring-white/5 transition-all hover:bg-surface-container-high hover:shadow-glow hover:ring-primary-container/30"
    >
      {/* The database holds no photographs, so this is a drawing of the kind of car, and says so. */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-b from-surface-container-lowest to-surface-container-low sm:h-48">
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`size-full object-contain px-6 pt-8 pb-3 transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none ${soldOut ? "opacity-40 grayscale" : ""}`}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent opacity-70" />
        <div className="absolute top-3 left-3">
          <StockBadge quantity={vehicle.quantity} />
        </div>
        <span aria-hidden="true" className="absolute right-3 bottom-2 text-[10px] font-semibold tracking-wider text-outline uppercase">
          Illustrative image
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-primary-container uppercase">{vehicle.category}</p>
          <h2 id={titleId} className="mt-1 font-display text-xl leading-tight font-semibold tracking-tight break-words text-on-surface transition-colors group-hover:text-primary-container">
            {name}
          </h2>
        </div>

        <p className={`font-display text-[1.75rem] leading-none font-bold tracking-tight tabular-nums ${soldOut ? "text-on-surface-variant" : "text-on-surface"}`}>
          {formatPrice(vehicle.price)}
        </p>

        {/* mt-auto keeps the buttons in a row across cards whatever the title length. */}
        <div className="mt-auto space-y-2">
          {onPurchase && (
            <Button
              className="w-full"
              disabled={soldOut}
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
          )}

          {loginToBuy && !soldOut && (
            <Link to={loginToBuy.to} state={loginToBuy.state} aria-label={`Log in to purchase ${name}`} className={linkButton}>
              <LogIn className="size-4" aria-hidden="true" />
              Log in to buy
            </Link>
          )}

          {admin && (
            // Three buttons share the row. On narrow phones there is no room for an icon beside "Restock" as well
            // (it needs 78px of a 77px button at 320px), and the words say it all, so the icons wait for width.
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
    <div aria-hidden="true" className="flex h-full flex-col overflow-hidden rounded-xl bg-surface-container shadow-md ring-1 ring-white/5">
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="h-44 bg-surface-container-low sm:h-48" />
        <div className="space-y-4 p-5">
          <div className="h-3 w-16 rounded bg-surface-container-high" />
          <div className="h-6 w-2/3 rounded bg-surface-container-high" />
          <div className="h-8 w-32 rounded bg-surface-container-high" />
          <div className="h-11 rounded-lg bg-surface-container-low" />
        </div>
      </div>
    </div>
  );
}
