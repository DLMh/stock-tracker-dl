// ─────────────────────────────────────────────────────────────
// Page d'accueil / Tableau de bord – Server Component
// Route : /  (dans le groupe de routes (dashboard))
// ─────────────────────────────────────────────────────────────

import { getDashboardDataAction } from "./actions";
import { DashboardClient } from "./DashboardClient";

export const revalidate = 10;

export const metadata = {
  title: "Tableau de bord – Suivi de stock",
  description: "Résumé des entrées et sorties de stock journalières et hebdomadaires",
};

export default async function DashboardPage() {
  const initialData = await getDashboardDataAction();

  return (
    <main className="min-h-screen bg-gray-50/60 pb-12">
      <DashboardClient initialData={initialData} />
    </main>
  );
}
