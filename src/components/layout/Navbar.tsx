"use client";

// ─────────────────────────────────────────────────────────────
// Navbar – Barre de navigation supérieure (Responsive)
// Affiche les liens, l'utilisateur connecté et le bouton Déconnexion
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSessionAction, logoutAction } from "@/app/login/actions";
import { type SessionUser } from "@/lib/auth";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    getSessionAction().then(setUser);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Tableau de bord" },
    { href: "/catalogue", label: "Catalogue" },
    { href: "/saisie", label: "Saisie" },
    { href: "/historique", label: "Historique" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo & Marque */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg text-gray-900 tracking-tight leading-none block">
              StockTracker
            </span>
            <span className="text-[11px] font-medium text-emerald-600 tracking-wide">
              UTC+3 Antananarivo
            </span>
          </div>
        </Link>

        {/* Liens Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions utilisateur & Saisie rapide */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Badge Utilisateur connecté */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-indigo-900">{user.nom}</span>
                <span className="text-[10px] px-1 rounded bg-indigo-200/60 font-semibold text-indigo-800 uppercase">
                  {user.role}
                </span>
              </div>

              {/* Bouton Déconnexion */}
              <button
                onClick={() => logoutAction()}
                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors text-xs font-semibold flex items-center gap-1"
                title="Se déconnecter"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden lg:inline">Quitter</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
            >
              Connexion
            </Link>
          )}

          {/* Raccourci Saisie */}
          <Link
            href="/saisie"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 transition-all active:scale-95 touch-manipulation"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Mouvement</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
