import { ArrowLeft, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandMark } from "../BrandMark";

/** How a field of the sign-in and sign-up forms looks: the design's small capitals, and a taller, lighter field. */
export const AUTH_LABEL = "text-xs font-semibold tracking-wider text-on-surface-variant uppercase";
export const AUTH_INPUT = "h-12 bg-surface-container!";

/**
 * The frame shared by the sign-in and sign-up pages: the showcase on a desktop, and beside it the column with the way back,
 * the form (as children) and the footer. Phones and tablets get the column alone, with the brand in its top row.
 */
export function AuthSplitLayout({ showcase, children }: { showcase: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1440px] bg-background">
      {showcase}

      <div className="relative z-20 flex min-w-0 flex-1 flex-col justify-between border-white/10 bg-background px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-12 sm:py-10 lg:w-[45%] lg:flex-none lg:border-l lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="group inline-flex min-h-11 items-center gap-2 rounded text-xs font-semibold tracking-wider text-outline uppercase transition-colors hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
            Back to home
          </Link>
          {/* The showcase carries the brand on a desktop; elsewhere it is here. */}
          <Link to="/" className="inline-flex min-h-11 items-center rounded lg:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container">
            <BrandMark />
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-10">{children}</div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-outline sm:flex-row">
          <span className="flex items-center gap-2">
            <Lock className="size-3.5 shrink-0 text-primary-container" aria-hidden="true" />
            Your password is never stored in plain text.
          </span>
          <span>&copy; {new Date().getFullYear()} AutoVault. All rights reserved.</span>
        </footer>
      </div>
    </main>
  );
}
