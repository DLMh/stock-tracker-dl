// ─────────────────────────────────────────────────────────────
// Page Historique — Server Component (entrée de route)
// Route : /(dashboard)/historique
// ─────────────────────────────────────────────────────────────

import { getHistoriqueAction, getProduitsAction } from "./actions";
import { HistoriqueClient } from "./HistoriqueClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Historique des mouvements",
};

export default async function HistoriquePage() {
  // Chargement initial : mois en cours, granularité jour
  const [historiqueInitial, produits] = await Promise.all([
    getHistoriqueAction({
      periode: "mois_en_cours",
      granularite: "jour",
      page: 1,
    }),
    getProduitsAction(),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <HistoriqueClient
        donneesInitiales={historiqueInitial}
        produits={produits}
      />
    </main>
  );
}
