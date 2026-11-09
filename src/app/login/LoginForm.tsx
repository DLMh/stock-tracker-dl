"use client";

// ─────────────────────────────────────────────────────────────
// LoginForm – Formulaire de connexion moderne & responsive (Tailwind v4)
// ─────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const formData = new FormData();
    formData.append("identifiant", identifiant);
    formData.append("motDePasse", motDePasse);

    startTransition(async () => {
      const res = await loginAction(null, formData);
      if (res?.error) {
        setErreur(res.error);
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl shadow-gray-100/60 p-6 sm:p-8 flex flex-col gap-6">
        {/* En-tête */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">
            Connexion
          </h1>
          <p className="text-xs text-gray-500">
            Accédez à la gestion et au suivi des mouvements de stock
          </p>
        </div>

        {/* Message d'erreur */}
        {erreur && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{erreur}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Champ Identifiant */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="identifiant"
              className="text-xs font-bold uppercase tracking-wider text-gray-600"
            >
              Identifiant <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="identifiant"
                type="text"
                required
                autoComplete="username"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="Votre identifiant"
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-4 py-3 pl-11 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="motDePasse"
              className="text-xs font-bold uppercase tracking-wider text-gray-600"
            >
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="motDePasse"
                type={afficherMdp ? "text" : "password"}
                required
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-4 py-3 pl-11 pr-11 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title={afficherMdp ? "Masquer" : "Afficher"}
              >
                {afficherMdp ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 rounded-2xl py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Vérification...</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
