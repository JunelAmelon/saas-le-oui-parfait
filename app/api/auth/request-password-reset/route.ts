import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { resolveBaseUrl, sendPasswordResetEmail } from '@/lib/password-reset-email';

/**
 * Endpoint public (pas d'auth requise) permettant à un client de redemander
 * un lien de définition de mot de passe, typiquement quand le précédent a
 * expiré. Volontairement silencieux sur l'existence du compte (on renvoie
 * toujours "ok") pour ne pas laisser deviner quels emails sont enregistrés.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });

    try {
      await adminAuth.getUserByEmail(email);
      const baseUrl = resolveBaseUrl(req);
      await sendPasswordResetEmail({ email, baseUrl });
    } catch (e: any) {
      // Compte introuvable ou erreur d'envoi : on ne le révèle pas à l'appelant.
      if (!String(e?.code || '').includes('auth/user-not-found')) {
        console.error('request-password-reset error:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('request-password-reset error:', e);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
