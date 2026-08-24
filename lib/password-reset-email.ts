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
 * Génère un lien de réinitialisation vers notre page personnalisée
 * /reset-password, et envoie l'email de marque correspondant.
 *
 * Firebase ne permet pas de faire pointer generatePasswordResetLink()
 * directement vers un domaine tiers (handleCodeInApp/url ne changent que le
 * bouton "Continuer" affiché APRÈS coup sur la page Firebase générique — ils
 * ne remplacent jamais l'hébergeur du lien lui-même ; c'était l'erreur de la
 * version précédente). On génère donc le lien Firebase normalement, on en
 * extrait uniquement le "oobCode", et on construit nous-mêmes l'URL finale
 * vers /reset-password : notre page vérifie ce code côté client avec le SDK
 * Firebase (verifyPasswordResetCode / confirmPasswordReset), donc la page
 * Firebase générique n'intervient jamais.
 */
export async function sendPasswordResetEmail(params: { email: string; baseUrl: string; role?: 'client' | 'vendor' | 'admin'; reason?: 'invitation' | 'forgot' }) {
  const email = params.email.trim().toLowerCase();
  const baseUrl = params.baseUrl;
  const role = params.role || 'client';
  const reason = params.reason || 'invitation';

  const firebaseLink = await adminAuth.generatePasswordResetLink(email);
  const oobCode = new URL(firebaseLink).searchParams.get('oobCode');
  if (!oobCode) {
    throw new Error('Unable to extract oobCode from the generated Firebase reset link');
  }

  const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) throw new Error('Missing SMTP_FROM');

  const isVendor = role === 'vendor';
  const spaceLabel = isVendor ? 'espace pro' : 'espace client';

  let subject: string;
  let title: string;
  let text: string;
  let ctaLabel: string;

  if (reason === 'forgot') {
    subject = `Réinitialisation de votre mot de passe - leouiparfait`;
    title = `Réinitialisation de votre mot de passe`;
    text = `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe pour votre ${spaceLabel}.\n\nCliquez sur le bouton ci-dessous pour en définir un nouveau.`;
    ctaLabel = 'Définir mon nouveau mot de passe';
  } else {
    subject = `Accès à votre ${spaceLabel} - leouiparfait`;
    title = `Accès à votre ${spaceLabel}`;
    text = `Bonjour,\n\nVotre accès à l'${spaceLabel} est prêt.\n\nCliquez sur le bouton ci-dessous pour définir votre mot de passe.`;
    ctaLabel = 'Définir mon mot de passe';
  }

  const plainText = `${text}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n`;

  const html = buildBrandedEmail({
    appName: 'leouiparfait',
    baseUrl,
    title,
    text,
    cta: { label: ctaLabel, url: resetLink },
  }).html;

  const transporter = createMailTransport();
  await transporter.sendMail({ from, to: email, subject, text: plainText, html });
}
