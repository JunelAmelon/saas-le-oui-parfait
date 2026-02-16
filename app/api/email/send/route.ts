import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { buildBrandedEmail } from '@/lib/email-template';

async function getEmailForUid(uid: string): Promise<string | null> {
  if (!uid) return null;

  let toEmail: string | null = null;

  if (!toEmail && uid) {
    // 1) Try profile doc
    try {
      const profileSnap = await adminDb.collection('profiles').doc(uid).get();
      const profile = profileSnap.exists ? profileSnap.data() : null;
      toEmail = (profile as any)?.email || null;
    } catch (e) {
      // ignore
    }

    // 2) Try auth user record
    if (!toEmail) {
      try {
        const userRecord = await adminAuth.getUser(uid);
        toEmail = userRecord.email || null;
      } catch (e) {
        // ignore
      }
    }
  }

  return toEmail;
}

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

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const body = (await req.json()) as {
      recipientUid?: string;
      recipientEmail?: string;
      subject?: string;
      text?: string;
      html?: string;
    };

    const recipientUid = String(body?.recipientUid || '');
    const recipientEmail = String(body?.recipientEmail || '');
    const subject = String(body?.subject || 'Notification');
    const text = body?.text ? String(body.text) : '';
    const html = body?.html ? String(body.html) : '';

    if ((!recipientUid && !recipientEmail) || !subject) {
      return NextResponse.json({ error: 'Missing recipientUid/recipientEmail or subject' }, { status: 400 });
    }

    let to: string;
    if (recipientEmail) {
      to = recipientEmail;
    } else {
      const resolved = await getEmailForUid(recipientUid);
      if (!resolved) return NextResponse.json({ ok: true, skipped: 'no_email_for_uid' });
      to = resolved;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) throw new Error('Missing SMTP_FROM');

    const transporter = createTransport();

    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || '';
    const finalHtml = html
      ? html
      : buildBrandedEmail({
          appName: 'leouiparfait',
          baseUrl,
          title: subject,
          text,
        }).html;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || undefined,
      html: finalHtml || undefined,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId, to });
  } catch (e: any) {
    console.error('email send error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
