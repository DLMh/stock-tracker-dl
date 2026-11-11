"use client";

// ─────────────────────────────────────────────────────────────
// NavigationProgress – Barre de progression animée en haut de l'écran
// Se déclenche instantanément dès le clic sur n'importe quel lien/onglet
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fin du chargement dès que l'URL change
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Interception des clics sur les liens internes
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignorer les ancres internes (#), les liens externes ou les téléchargements
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      ) {
        return;
      }

      // Si c'est un lien interne vers une autre page
      try {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);

        if (url.origin === currentUrl.origin) {
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            setLoading(true);
            setProgress(25);

            // Simulation d'avancement fluide en attendant le serveur
            setTimeout(() => setProgress(60), 100);
            setTimeout(() => setProgress(80), 300);
          }
        }
      } catch {
        // En cas d'URL relative simple
        if (href.startsWith("/") && href !== pathname) {
          setLoading(true);
          setProgress(30);
          setTimeout(() => setProgress(70), 150);
        }
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* 1. Ligne de progression lumineuse en haut */}
      <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none h-1.5 bg-transparent overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-400 shadow-[0_0_16px_rgba(99,102,241,1)] transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      </div>

      {/* 2. Badge flottant avec Spinner bien visible au centre supérieur */}
      <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gray-900/95 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-white/20 animate-in fade-in slide-in-from-top-2 duration-150">
          <svg className="w-4 h-4 animate-spin text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="tracking-wide">Chargement...</span>
        </div>
      </div>
    </>
  );
}
