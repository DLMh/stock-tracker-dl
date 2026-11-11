"use client";

// ─────────────────────────────────────────────────────────────
// NavigationProgress – Indicateur de chargement global instantané
// Déclenché au toucher/clic (0ms) via manipulation directe du DOM
// pour contourner le batching de transitions React 19 / Next.js
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cacher le loader dès que l'URL change (la nouvelle page est prête)
  useEffect(() => {
    hideLoader();
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignorer les ancres internes, liens externes ou boutons sans navigation
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      ) {
        return;
      }

      try {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);

        if (url.origin === currentUrl.origin) {
          // Si on clique vers une page différente
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            showLoader();
          }
        }
      } catch {
        if (href.startsWith("/") && href !== window.location.pathname) {
          showLoader();
        }
      }
    };

    // 'pointerdown' se déclenche avant le clic, dès le toucher sur mobile ou appui souris
    window.addEventListener("pointerdown", handleStart, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleStart, { capture: true });
    };
  }, []);

  function showLoader() {
    const el = document.getElementById("global-page-spinner");
    const bar = document.getElementById("global-page-bar");

    if (el) {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    }

    if (bar) {
      bar.style.width = "75%";
      bar.style.opacity = "1";
    }

    // Sécurité : masquer automatiquement au bout de 6s si la navigation échoue
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      hideLoader();
    }, 6000);
  }

  function hideLoader() {
    if (timerRef.current) clearTimeout(timerRef.current);

    const el = document.getElementById("global-page-spinner");
    const bar = document.getElementById("global-page-bar");

    if (bar) {
      bar.style.width = "100%";
      setTimeout(() => {
        if (bar) {
          bar.style.opacity = "0";
          bar.style.width = "0%";
        }
      }, 200);
    }

    if (el) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }
  }

  return (
    <>
      {/* 1. Barre de progression lumineuse en haut */}
      <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-1.5 bg-transparent overflow-hidden">
        <div
          id="global-page-bar"
          style={{ width: "0%", opacity: 0 }}
          className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-400 shadow-[0_0_16px_rgba(99,102,241,1)] transition-all duration-300 ease-out"
        />
      </div>

      {/* 2. Badge flottant avec Spinner au centre de l'écran (Impossible à rater) */}
      <div
        id="global-page-spinner"
        style={{ opacity: 0, pointerEvents: "none" }}
        className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/10 backdrop-blur-[1px] transition-opacity duration-150"
      >
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gray-950/95 text-white text-sm font-bold shadow-2xl border border-white/20">
          <svg
            className="w-5 h-5 animate-spin text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          <span className="tracking-wide">Chargement...</span>
        </div>
      </div>
    </>
  );
}

/** Fonction globale utilisable en secours direct sur un onClick */
export function triggerGlobalLoader() {
  const el = document.getElementById("global-page-spinner");
  const bar = document.getElementById("global-page-bar");
  if (el) {
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
  }
  if (bar) {
    bar.style.width = "75%";
    bar.style.opacity = "1";
  }
}
