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
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-transparent overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
