import { AppHeader } from "../components/AppHeader";

export function DashboardPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vehicles</h1>
        <p className="mt-2 text-slate-600">The inventory appears here in the next step.</p>
      </main>
    </>
  );
}
