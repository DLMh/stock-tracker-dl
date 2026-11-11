"use client";

// ─────────────────────────────────────────────────────────────
// BottomNav – Barre de navigation inférieure fixe pour mobile
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { triggerGlobalLoader } from "@/components/layout/NavigationProgress";

export function BottomNav() {
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const items = [
    {
      href: "/",
      label: "Accueil",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/catalogue",
      label: "Catalogue",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: "/saisie",
      label: "Saisie",
      special: true,
      icon: (_active?: boolean) => (
        <div className="w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 border-2 border-white active:scale-95 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      ),
    },
    {
      href: "/historique",
      label: "Historique",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg pb-safe">
      <div className="grid grid-cols-4 h-16 items-center px-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const isNavigating = navigatingTo === item.href;

          if (item.special) {
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => {
                  if (pathname !== item.href) {
                    setNavigatingTo(item.href);
                    triggerGlobalLoader();
                  }
                }}
                onTouchStart={() => {
                  if (pathname !== item.href) {
                    setNavigatingTo(item.href);
                    triggerGlobalLoader();
                  }
                }}
                className="flex flex-col items-center justify-center text-xs font-semibold text-gray-700 active:opacity-80"
              >
                <div className={`w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 border-2 border-white active:scale-95 transition-transform ${isNavigating ? "animate-pulse" : ""}`}>
                  {isNavigating ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </div>
                <span className="mt-0.5 text-[10px] text-emerald-600 font-bold">
                  {isNavigating ? "Chargement..." : item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => {
                if (pathname !== item.href) {
                  setNavigatingTo(item.href);
                  triggerGlobalLoader();
                }
              }}
              onTouchStart={() => {
                if (pathname !== item.href) {
                  setNavigatingTo(item.href);
                  triggerGlobalLoader();
                }
              }}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isNavigating
                  ? "text-indigo-600 font-bold"
                  : isActive
                  ? "text-indigo-600 font-bold"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {isNavigating ? (
                <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                item.icon(isActive)
              )}
              <span className="text-[10px] mt-0.5 tracking-tight">
                {isNavigating ? "..." : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
