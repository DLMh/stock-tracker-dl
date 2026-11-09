// ─────────────────────────────────────────────────────────────
// Middleware de protection des routes – StockTracker
// Vérifie le cookie de session et protège les accès non authentifiés
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "stock_tracker_session";
const SESSION_SECRET = process.env.AUTH_SECRET || "stock_tracker_fallback_secret_key_2026";

/**
 * Valide le jeton de session signé en utilisant Web Crypto (compatible Edge & Node)
 */
async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, signatureHex] = parts;
    if (!payload || !signatureHex) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      enc.encode(payload)
    );

    if (!isValid) return false;

    // Décoder et vérifier le payload + expiration
    const decodedStr = atob(payload);
    const data = JSON.parse(decodedStr);

    if (!data || !data.id || !data.identifiant) {
      return false;
    }

    if (data.expiresAt && Date.now() > data.expiresAt) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorer les fichiers statiques et internes Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie ? await verifySessionToken(sessionCookie) : false;

  // 2. Si l'utilisateur est déjà authentifié et tente d'accéder à /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 3. Toutes les autres pages de l'application sont protégées
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Intercepte toutes les requêtes sauf les assets statiques
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
