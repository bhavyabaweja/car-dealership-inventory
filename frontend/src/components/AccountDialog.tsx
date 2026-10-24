import { Link } from "react-router";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface AccountDialogProps {
  /** Where to come back to after logging in or registering, such as the page with the visitor's search in its address. */
  from: string;
  onClose: () => void;
}

const link =
  "flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/** Shown when a visitor searches: the inventory is for signed-in visitors, and the search waits for them. */
export function AccountDialog({ from, onClose }: AccountDialogProps) {
  return (
    <Dialog title="Account required" onClose={onClose}>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        The live inventory, with its prices and stock, is for signed-in visitors. Log in or create an account to see it. Your search is kept and runs as
        soon as you sign in.
      </p>
      <div className="mt-6 space-y-3">
        <Link
          to="/login"
          state={{ from }}
          data-autofocus
          className={`${link} bg-primary-container font-display font-bold text-on-primary-container hover:bg-primary hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]`}
        >
          Log in
        </Link>
        <Link to="/register" state={{ from }} className={`${link} bg-surface-container-low text-on-surface ring-1 ring-white/10 ring-inset hover:text-primary-container`}>
          Create an account
        </Link>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Keep browsing
        </Button>
      </div>
    </Dialog>
  );
}
