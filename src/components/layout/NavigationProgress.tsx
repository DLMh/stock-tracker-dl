"use client";

// ─────────────────────────────────────────────────────────────
// NavigationProgress – Indicateur de chargement global
// Approche robuste compatible Vercel Edge Cache :
// - showLoader() s'exécute immédiatement (DOM direct)
// - hideLoader() attend au minimum MIN_MS après le show()
// - Un flag "pending hide" est posé si pathname change
//   avant que showLoader() ait eu le temps de s'initialiser
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_MS = 600; // durée minimale d'affichage du spinner

function getSpinner() { return document.getElementById("global-page-spinner"); }
function getBar()     { return document.getElementById("global-page-bar"); }

export function NavigationProgress() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const startedAtRef   = useRef<number | null>(null);   // timestamp showLoader()
  const hideScheduled  = useRef(false);                 // un hide est en attente ?
  const safetyTimer    = useRef<NodeJS.Timeout | null>(null);
  const hideTimer      = useRef<NodeJS.Timeout | null>(null);

  // ─── Quand la page change → planifier le masquage ───────
  useEffect(() => {
    // pathname a changé → la nouvelle page est montée côté client
    if (startedAtRef.current !== null) {
      // spinner déjà visible : on planifie hide après MIN_MS
      planHide();
    } else {
      // showLoader() n'a pas encore eu le temps de tourner (Vercel ultra-rapide)
      // on pose un flag : dès que showLoader() se lance, il se masquera après MIN_MS
      hideScheduled.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // ─── Écouter les clics / touchers sur les liens ─────────
  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") || href.startsWith("mailto:") ||
        href.startsWith("tel:") || anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) return;

      try {
        const dest = new URL(anchor.href);
        const cur  = new URL(window.location.href);
        if (dest.origin === cur.origin &&
            (dest.pathname !== cur.pathname || dest.search !== cur.search)) {
          showLoader();
        }
      } catch {
        if (href.startsWith("/") && href !== window.location.pathname) showLoader();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  // ─── Afficher le spinner ─────────────────────────────────
  function showLoader() {
    if (hideTimer.current)   clearTimeout(hideTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);

    startedAtRef.current = Date.now();
    hideScheduled.current = false;

    const el  = getSpinner();
    const bar = getBar();
    if (el)  el.style.opacity = "1";
    if (bar) { bar.style.width = "75%"; bar.style.opacity = "1"; }

    // Sécurité : masquer après 8s si navigation ne se termine pas
    safetyTimer.current = setTimeout(doHide, 8000);

    // Si un hide était déjà demandé (page arrivée avant showLoader), masquer après MIN_MS
    if (hideScheduled.current) {
      hideScheduled.current = false;
      planHide();
    }
  }

  // ─── Planifier le masquage (respecter MIN_MS) ────────────
  function planHide() {
    const elapsed   = startedAtRef.current ? Date.now() - startedAtRef.current : MIN_MS;
    const remaining = Math.max(0, MIN_MS - elapsed);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(doHide, remaining);
  }

  // ─── Masquer le spinner ──────────────────────────────────
  function doHide() {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    if (hideTimer.current)   clearTimeout(hideTimer.current);
    startedAtRef.current  = null;
    hideScheduled.current = false;

    const el  = getSpinner();
    const bar = getBar();
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
      {/* Barre de progression en haut */}
      <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-1.5 bg-transparent overflow-hidden">
        <div
          id="global-page-bar"
          style={{ width: "0%", opacity: 0 }}
          className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-400 shadow-[0_0_16px_rgba(99,102,241,1)] transition-all duration-300 ease-out"
        />
      </div>

      {/* Badge spinner centré – toujours pointer-events-none */}
      <div
        id="global-page-spinner"
        style={{ opacity: 0 }}
        className="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center bg-black/10 backdrop-blur-[1px] transition-opacity duration-150"
      >
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gray-950/95 text-white text-sm font-bold shadow-2xl border border-white/20">
          <svg className="w-5 h-5 animate-spin text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="tracking-wide">Chargement...</span>
        </div>
      </div>
    </>
  );
}

/** Fonction globale utilisable directement sur un onClick */
export function triggerGlobalLoader() {
  const el  = document.getElementById("global-page-spinner");
  const bar = document.getElementById("global-page-bar");
  if (el)  el.style.opacity = "1";
  if (bar) { bar.style.width = "75%"; bar.style.opacity = "1"; }
}
