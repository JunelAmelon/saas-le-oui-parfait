export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { qontoRequest } from '@/lib/qonto';

async function getRoleForUid(uid: string): Promise<'planner' | 'client' | null> {
  try {
    const snap = await adminDb.collection('profiles').doc(uid).get();
    const role = snap.exists ? (snap.data() as any)?.role : null;
    return role === 'planner' || role === 'client' ? role : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const role = await getRoleForUid(uid);
    if (role !== 'planner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let data: any;
    try {
      data = await qontoRequest<any>({ method: 'GET', path: '/v2/organization' });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('Missing Qonto env vars (QONTO_API_LOGIN/QONTO_API_SECRET_KEY)')) {
        return NextResponse.json(
          {
            error: 'qonto_requires_oauth',
            details: 'OAuth access token missing. Click "Connect with Qonto" and complete the consent flow first.',
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const org = data?.organization || data;
    const organizationId = String(org?.id || '');
    const bankAccounts = Array.isArray(org?.bank_accounts) ? org.bank_accounts : [];

    return NextResponse.json({
      ok: true,
      organization_id: organizationId || null,
      bank_accounts: bankAccounts.map((b: any) => ({
        id: String(b?.id || ''),
        iban: String(b?.iban || ''),
        status: String(b?.status || ''),
        main: Boolean(b?.main),
      })),
      raw: data,
    });
  } catch (e: any) {
    console.error('qonto organization error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
