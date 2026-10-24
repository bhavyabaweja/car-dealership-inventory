import { Car } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** The line under the card, such as a link to the other auth page. */
  footer: ReactNode;
}

/** The centred card shared by the login and register pages, on the same midnight canvas as the rest of the app. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:py-16">
      {/* Two soft pools of light behind the card, as in the hero of the inventory page. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-20 size-96 rounded-full bg-secondary-container/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-primary-container/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-gradient-to-br from-secondary-container to-primary-container text-white shadow-glow">
          <Car className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-center font-display text-3xl font-bold tracking-tight text-on-surface">{title}</h1>
        <p className="mt-1.5 text-center text-sm text-on-surface-variant">{subtitle}</p>
        <div className="mt-8 rounded-2xl bg-surface-container/90 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur sm:p-8">{children}</div>
        <p className="mt-6 text-center text-sm text-on-surface-variant">{footer}</p>
      </div>
    </main>
  );
}
