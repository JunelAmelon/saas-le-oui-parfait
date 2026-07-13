import { adminAuth } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { buildBrandedEmail } from '@/lib/email-template';

export function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP env vars (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function resolveBaseUrl(req: Request) {
  const explicit = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (explicit) {
    const raw = String(explicit).trim();
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // fallback to request origin
    }
  }
  try {
    const url = new URL(req.url);
    return url.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

/**
 * Génère un lien de réinitialisation Firebase pointant vers notre page
 * personnalisée /reset-password, et envoie l'email de marque correspondant.
 * Utilisé à la fois pour l'invitation initiale d'un client et pour le
 * renvoi d'un lien lorsque le précédent a expiré.
 */
export async function sendPasswordResetEmail(params: { email: string; baseUrl: string }) {
  const email = params.email.trim().toLowerCase();
  const baseUrl = params.baseUrl;
  const continueUrl = `${baseUrl.replace(/\/$/, '')}/reset-password`;

  let resetLink = '';
  try {
    resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });
  } catch (e: any) {
    const code = String(e?.errorInfo?.code || e?.code || '');
    if (code.includes('auth/invalid-continue-uri') || code.includes('auth/unauthorized-continue-uri')) {
      resetLink = await adminAuth.generatePasswordResetLink(email);
    } else {
      throw e;
    }
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) throw new Error('Missing SMTP_FROM');

  const subject = 'Accès à votre espace client - leouiparfait';
  const text = `Bonjour,\n\nVotre accès à l'espace client est prêt.\n\nPour définir votre mot de passe, cliquez sur ce lien :\n${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n`;

  const html = buildBrandedEmail({
    appName: 'leouiparfait',
    baseUrl,
    title: 'Accès à votre espace client',
    text: `Bonjour,\n\nVotre accès à l'espace client est prêt.\n\nCliquez sur le bouton ci-dessous pour définir votre mot de passe.`,
    cta: { label: 'Définir mon mot de passe', url: resetLink },
  }).html;

  const transporter = createMailTransport();
  await transporter.sendMail({ from, to: email, subject, text, html });
}
