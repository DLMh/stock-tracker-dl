// ─────────────────────────────────────────────────────────────
// Page Catalogue & Produits – Server Component
// Route : /catalogue
// ─────────────────────────────────────────────────────────────

import { getCatalogueDataAction } from "./actions";
import { CatalogueClient } from "./CatalogueClient";

export const revalidate = 15;

export const metadata = {
  title: "Catalogue – Catégories & Produits",
  description: "Gestion complète du catalogue hiérarchique (Catégorie > Sous-catégorie > Produit)",
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: "arborescence" | "produits" | "categories" }>;
}) {
  const initialData = await getCatalogueDataAction();
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50/60 pb-12">
      <CatalogueClient
        initialData={initialData}
        defaultTab={params?.tab || "arborescence"}
      />
    </main>
  );
}
