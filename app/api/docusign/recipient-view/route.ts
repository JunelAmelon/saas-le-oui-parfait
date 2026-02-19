import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { docusignRequest, getDocuSignEnv } from '@/lib/docusign';

export const runtime = 'nodejs';

type Body = {
  envelopeId: string;
  recipientRole: 'client' | 'planner';
  returnUrl?: string;
};

function resolveReturnUrl(req: Request) {
  const explicit = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (explicit) {
    const raw = String(explicit).trim();
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // ignore
    }
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = String(decoded?.uid || '').trim();
    const callerEmail = String((decoded as any)?.email || '').trim().toLowerCase();
    const callerName = String((decoded as any)?.name || 'Utilisateur');

    const body = (await req.json()) as Body;
    const envelopeId = String(body?.envelopeId || '').trim();
    const recipientRole = body?.recipientRole;
    if (!envelopeId || !recipientRole) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

    const env = getDocuSignEnv();
    const metaSnap = await adminDb.collection('docusign_envelopes').doc(envelopeId).get();
    const meta = metaSnap.exists ? (metaSnap.data() as any) : null;
    if (!meta) return NextResponse.json({ error: 'envelope_not_found' }, { status: 404 });

    const base = resolveReturnUrl(req);
    const defaultReturnUrl = recipientRole === 'planner' ? `${base}/agence/contrats` : `${base}/espace-client/documents`;
    const returnUrl = String(body?.returnUrl || defaultReturnUrl);

    let recipientId = '1';
    let email = String(meta.client_email || '');
    let userName = String(meta.client_name || 'Client');
    let clientUserId = email;

    if (recipientRole === 'planner') {
      if (!callerUid || String(meta.planner_uid || '') !== callerUid) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      recipientId = '2';
      email = String(meta.planner_email || callerEmail || '');
      userName = callerName || 'Wedding Planner';
      clientUserId = email;
    } else {
      const expectedClientUid = String(meta.client_user_id || '');
      if (!callerUid || !expectedClientUid || expectedClientUid !== callerUid) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    if (!email) return NextResponse.json({ error: 'missing_recipient_email' }, { status: 400 });

    const view = await docusignRequest<{ url: string }>({
      method: 'POST',
      path: `/v2.1/accounts/${env.accountId}/envelopes/${envelopeId}/views/recipient`,
      body: {
        returnUrl,
        authenticationMethod: 'none',
        email,
        userName,
        recipientId,
        clientUserId,
      },
    });

    return NextResponse.json({ ok: true, url: view.url });
  } catch (e: any) {
    console.error('docusign recipient-view error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
