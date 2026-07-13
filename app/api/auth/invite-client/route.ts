import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveBaseUrl, sendPasswordResetEmail } from '@/lib/password-reset-email';

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
    await sendPasswordResetEmail({ email, baseUrl });

    return NextResponse.json({ ok: true, uid });
  } catch (e: any) {
    console.error('invite-client error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
