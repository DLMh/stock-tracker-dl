// ─────────────────────────────────────────────────────────────
// Loading global pour les transitions d'onglets
// ─────────────────────────────────────────────────────────────

export default function GlobalLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6 animate-pulse">
      {/* Barre de chargement supérieure */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 animate-[shimmer_1.5s_infinite] z-50" />

      {/* Titre & sous-titre */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-60 bg-gray-200 rounded-xl" />
        <div className="h-4 w-96 bg-gray-200 rounded-lg max-w-full" />
      </div>

      {/* Cartes skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-28 bg-gray-200/80 rounded-2xl" />
        <div className="h-28 bg-gray-200/80 rounded-2xl" />
        <div className="h-28 bg-gray-200/80 rounded-2xl sm:col-span-2 lg:col-span-1" />
      </div>

      {/* Bloc principal skeleton */}
      <div className="h-64 bg-gray-200/80 rounded-3xl mt-2" />
    </div>
  );
}
