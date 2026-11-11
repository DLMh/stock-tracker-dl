// ─────────────────────────────────────────────────────────────
// Loading Skeleton pour la page Historique & Statistiques
// ─────────────────────────────────────────────────────────────

export default function HistoriqueLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6 animate-pulse">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-72 bg-gray-200 rounded-lg max-w-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-200 rounded-xl" />
          <div className="h-9 w-20 bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* Filtres de période skeleton */}
      <div className="p-5 bg-white rounded-2xl border border-gray-200 flex flex-col gap-4">
        <div className="h-4 w-24 bg-gray-200 rounded-md" />
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-28 bg-gray-200 rounded-xl" />
          <div className="h-9 w-32 bg-gray-200 rounded-xl" />
          <div className="h-9 w-32 bg-gray-200 rounded-xl" />
          <div className="h-9 w-28 bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* Onglets (Agrégats / Mouvements / Stocks) */}
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
        <div className="h-10 w-36 bg-gray-200 rounded-xl" />
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
      </div>

      {/* Tableau / Lignes skeleton */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="py-3 border-b border-gray-100 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-200" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-36 bg-gray-200 rounded-md" />
                <div className="h-3 w-48 bg-gray-200 rounded-md" />
              </div>
            </div>
            <div className="h-5 w-20 bg-gray-200 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
