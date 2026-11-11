// ─────────────────────────────────────────────────────────────
// Loading Skeleton pour la page Catalogue
// ─────────────────────────────────────────────────────────────

export default function CatalogueLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6 animate-pulse">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 bg-gray-200 rounded-xl" />
          <div className="h-4 w-80 bg-gray-200 rounded-lg max-w-full" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-xl" />
      </div>

      {/* Onglets Catalogue */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <div className="h-9 w-32 bg-gray-200 rounded-xl" />
        <div className="h-9 w-32 bg-gray-200 rounded-xl" />
        <div className="h-9 w-32 bg-gray-200 rounded-xl" />
      </div>

      {/* Barre de recherche */}
      <div className="h-12 bg-gray-200/80 rounded-2xl" />

      {/* Liste d'éléments arborescence skeleton */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 bg-white rounded-2xl border border-gray-200/80 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-40 bg-gray-200 rounded-md" />
                <div className="h-3 w-24 bg-gray-200 rounded-md" />
              </div>
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
