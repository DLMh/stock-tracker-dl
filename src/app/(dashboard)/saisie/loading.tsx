// ─────────────────────────────────────────────────────────────
// Loading Skeleton pour la page Saisie
// S'affiche instantanément lors du clic sur l'onglet Saisie (0ms)
// ─────────────────────────────────────────────────────────────

export default function SaisieLoading() {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6 px-4 py-6 animate-pulse">
      {/* En-tête skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 bg-gray-200 rounded-xl" />
        <div className="h-4 w-72 bg-gray-200 rounded-lg" />
      </div>

      {/* Boutons Entrée / Sortie */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-gray-200 rounded-2xl" />
        <div className="h-14 bg-gray-200 rounded-2xl" />
      </div>

      {/* Sélecteur de produit skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 bg-gray-200 rounded-md" />
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>

      {/* Quantité skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-20 bg-gray-200 rounded-md" />
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>

      {/* Date et heure skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 w-24 bg-gray-200 rounded-md" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
        <div className="flex-[2] flex flex-col gap-2">
          <div className="h-4 w-28 bg-gray-200 rounded-md" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* Bouton d'action skeleton */}
      <div className="h-14 bg-gray-200 rounded-2xl mt-2" />
    </div>
  );
}
