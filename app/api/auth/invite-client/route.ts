import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { buildBrandedEmail } from '@/lib/email-template';

function createTransport() {
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

function resolveBaseUrl(req: Request) {
  const explicit = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (explicit) return explicit;
  try {
    const url = new URL(req.url);
    return url.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const body = (await req.json()) as { email?: string; fullName?: string };
    const email = String(body?.email || '').trim().toLowerCase();
    const fullName = String(body?.fullName || '').trim();

    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });

    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
    } catch (e: any) {
      if (String(e?.code || '').includes('auth/user-not-found')) {
        const created = await adminAuth.createUser({
          email,
          emailVerified: false,
          displayName: fullName || undefined,
          disabled: false,
        });
        uid = created.uid;
      } else {
        throw e;
      }
    }

    // Ensure profile exists for recipient lookup (best effort)
    try {
      await adminDb
        .collection('profiles')
        .doc(uid)
        .set(
          {
            uid,
            email,
            role: 'client',
            full_name: fullName || '',
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
    } catch (e) {
      // ignore
    }

    const baseUrl = resolveBaseUrl(req);
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: `${baseUrl}/login`,
      handleCodeInApp: false,
    });

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

    const transporter = createTransport();
    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true, uid });
  } catch (e: any) {
    console.error('invite-client error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
