import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveBaseUrl, sendPasswordResetEmail } from '@/lib/password-reset-email';

const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

async function checkRateLimit(email: string, ip: string): Promise<boolean> {
  const now = Date.now();
  const since = now - WINDOW_MS;

  const col = adminDb.collection('rate_limits');

  // Check email count
  const emailSnap = await col
    .where('email', '==', email)
    .where('created_at', '>', new Date(since))
    .get();
  if (emailSnap.size >= MAX_PER_EMAIL) return false;

  // Check IP count
  const ipSnap = await col
    .where('ip', '==', ip)
    .where('created_at', '>', new Date(since))
    .get();
  if (ipSnap.size >= MAX_PER_IP) return false;

  // Record this attempt
  await col.add({
    email,
    ip,
    endpoint: 'password-reset',
    created_at: new Date(now),
  });

  return true;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });

    // Rate limiting
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(email, ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Trop de demandes. Réessayez dans une heure.' },
        { status: 429 }
      );
    }

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    let role: 'client' | 'vendor' | 'admin' = 'client';
    try {
      const profileDoc = await adminDb.collection('profiles').doc(userRecord.uid).get();
      if (profileDoc.exists) {
        const data = profileDoc.data() as any;
        role = data.role || 'client';
      }
    } catch {
      // fallback to client
    }

    const baseUrl = resolveBaseUrl(req);
    await sendPasswordResetEmail({ email, baseUrl, role, reason: 'forgot' });

    return NextResponse.json({ ok: true, role });
  } catch (e: any) {
    console.error('request-password-reset error:', e);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
