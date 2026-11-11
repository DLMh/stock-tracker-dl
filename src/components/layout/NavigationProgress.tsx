"use client";

// ─────────────────────────────────────────────────────────────
// NavigationProgress – Indicateur de chargement global
// Déclenché via useTransition (startTransition de Next.js) pour
// détecter fiablement les navigations en cours, en local ET sur Vercel.
// Le spinner reste visible au minimum 400ms pour être perceptible.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Date à laquelle le loader a commencé (pour respecter le min 400ms)
  const loaderStartRef = useRef<number | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Masquer le loader quand le pathname change (nouvelle page rendue)
  useEffect(() => {
    scheduleHide();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleStart = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

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

    window.addEventListener("pointerdown", handleStart, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleStart, { capture: true });
    };
  }, []);

  function showLoader() {
    // Annuler tout masquage en cours
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    loaderStartRef.current = Date.now();

    const el = document.getElementById("global-page-spinner");
    const bar = document.getElementById("global-page-bar");
    if (el) el.style.opacity = "1";
    if (bar) { bar.style.width = "75%"; bar.style.opacity = "1"; }

    // Sécurité : masquer après 8s si jamais la navigation échoue
    safetyTimerRef.current = setTimeout(() => doHide(), 8000);
  }

  function scheduleHide() {
    if (loaderStartRef.current === null) return; // loader pas actif, rien à faire

    const elapsed = Date.now() - loaderStartRef.current;
    const minDisplay = 400; // ms minimum d'affichage pour être visible sur Vercel
    const remaining = Math.max(0, minDisplay - elapsed);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => doHide(), remaining);
  }

  function doHide() {
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    loaderStartRef.current = null;

    const el = document.getElementById("global-page-spinner");
    const bar = document.getElementById("global-page-bar");

    if (bar) {
      bar.style.width = "100%";
      setTimeout(() => {
        if (bar) { bar.style.opacity = "0"; bar.style.width = "0%"; }
      }, 200);
    }
    if (el) el.style.opacity = "0";
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

      {/* 2. Badge flottant avec Spinner au centre de l'écran (Toujours pointer-events-none pour ne jamais bloquer le clic) */}
      <div
        id="global-page-spinner"
        style={{ opacity: 0 }}
        className="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center bg-black/10 backdrop-blur-[1px] transition-opacity duration-150"
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
  }
  if (bar) {
    bar.style.width = "75%";
    bar.style.opacity = "1";
  }
}
