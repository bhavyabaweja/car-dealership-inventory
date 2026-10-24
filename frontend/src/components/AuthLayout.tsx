import { Car } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** The line under the card, such as a link to the other auth page. */
  footer: ReactNode;
}

/** The centred card shared by the login and register pages. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:py-16">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm">
          <Car className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1.5 text-center text-sm text-slate-600">{subtitle}</p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </main>
  );
}
