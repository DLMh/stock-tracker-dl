// ─────────────────────────────────────────────────────────────
// Footer – Pied de page global de l'application
// Copyright : © 2026 DLMH. Tous droits réservés.
// ─────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200/80 bg-white/70 backdrop-blur-sm py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="font-semibold text-gray-700">StockTracker</span>
          <span className="text-gray-300">|</span>
          <span>Gestion des flux de stock</span>
        </div>

        <div className="font-medium text-gray-600 text-center sm:text-right">
          © 2026 DLMH. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
