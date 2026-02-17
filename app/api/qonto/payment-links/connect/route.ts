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

function pickString(v: any) {
  const s = String(v ?? '').trim();
  return s || null;
}

function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalhostUrl(v: string) {
  try {
    const u = new URL(v);
    const h = (u.hostname || '').toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const role = await getRoleForUid(uid);
    if (role !== 'planner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    // Payment Links endpoints require OAuth Bearer token.
    const integrationSnap = await adminDb.collection('integrations').doc('qonto').get();
    const integrationData = integrationSnap.exists ? (integrationSnap.data() as any) : null;
    const storedAccessToken = String(integrationData?.access_token || '').trim();
    if (!storedAccessToken) {
      return NextResponse.json(
        {
          error: 'qonto_payment_links_requires_oauth',
          details: 'OAuth access token missing. Run “Connect with Qonto” in this environment (prod vs local) and complete the consent flow.',
        },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const partnerCallbackUrl =
      pickString(body?.partnerCallbackUrl) ||
      pickString(process.env.QONTO_PAYMENT_LINKS_PARTNER_CALLBACK_URL) ||
      pickString(process.env.QONTO_PARTNER_CALLBACK_URL);

    const bankAccountId =
      pickString(body?.bankAccountId) ||
      pickString(body?.user_bank_account_id) ||
      pickString(process.env.QONTO_PAYMENT_LINKS_BANK_ACCOUNT_ID) ||
      pickString(process.env.QONTO_BANK_ACCOUNT_ID);

    const phoneNumber =
      pickString(body?.phoneNumber) ||
      pickString(body?.user_phone_number) ||
      pickString(process.env.QONTO_PAYMENT_LINKS_PHONE_NUMBER) ||
      pickString(process.env.QONTO_PHONE_NUMBER);

    const websiteUrl =
      pickString(body?.websiteUrl) ||
      pickString(body?.user_website_url) ||
      pickString(process.env.QONTO_PAYMENT_LINKS_WEBSITE_URL) ||
      pickString(process.env.QONTO_WEBSITE_URL);

    const description =
      pickString(body?.description) ||
      pickString(body?.business_description) ||
      pickString(process.env.QONTO_PAYMENT_LINKS_BUSINESS_DESCRIPTION) ||
      pickString(process.env.QONTO_BUSINESS_DESCRIPTION);

    const missing: string[] = [];
    if (!partnerCallbackUrl) missing.push('partnerCallbackUrl (or QONTO_PAYMENT_LINKS_PARTNER_CALLBACK_URL)');
    if (!bankAccountId) missing.push('bankAccountId (or QONTO_PAYMENT_LINKS_BANK_ACCOUNT_ID)');
    if (!phoneNumber) missing.push('phoneNumber (or QONTO_PAYMENT_LINKS_PHONE_NUMBER)');
    if (!websiteUrl) missing.push('websiteUrl (or QONTO_PAYMENT_LINKS_WEBSITE_URL)');
    if (!description) missing.push('description (or QONTO_PAYMENT_LINKS_BUSINESS_DESCRIPTION)');

    if (missing.length) {
      return NextResponse.json({ error: 'missing_fields', details: { missing } }, { status: 400 });
    }

    const bankAccountIdStr = bankAccountId as string;
    if (!isUuidLike(bankAccountIdStr)) {
      return NextResponse.json(
        {
          error: 'invalid_bank_account_id',
          details: {
            provided: bankAccountIdStr,
            hint: 'Expected a UUID (36 chars). Fetch the correct bank_account_id from GET /api/qonto/organization (bank_accounts[].id).',
          },
        },
        { status: 400 }
      );
    }

    const partnerCallbackUrlStr = partnerCallbackUrl as string;
    if (!isHttpUrl(partnerCallbackUrlStr)) {
      return NextResponse.json(
        {
          error: 'invalid_partner_callback_url',
          details: {
            provided: partnerCallbackUrlStr,
            hint: 'Must be a valid URL starting with http:// or https:// (example: https://your-domain.com/settings?tab=integrations).',
          },
        },
        { status: 400 }
      );
    }

    if (isLocalhostUrl(partnerCallbackUrlStr)) {
      return NextResponse.json(
        {
          error: 'partner_callback_url_must_be_public',
          details: {
            provided: partnerCallbackUrlStr,
            hint: 'Qonto refuses localhost URLs. Use your deployed domain (https://...) or a public tunnel (ngrok/Cloudflare Tunnel), then retry activation.',
          },
        },
        { status: 400 }
      );
    }

    const websiteUrlStr = websiteUrl as string;
    if (!isHttpUrl(websiteUrlStr)) {
      return NextResponse.json(
        {
          error: 'invalid_website_url',
          details: {
            provided: websiteUrlStr,
            hint: 'Must be a valid URL starting with http:// or https:// (example: https://your-domain.com).',
          },
        },
        { status: 400 }
      );
    }

    if (isLocalhostUrl(websiteUrlStr)) {
      return NextResponse.json(
        {
          error: 'website_url_must_be_public',
          details: {
            provided: websiteUrlStr,
            hint: 'Qonto refuses localhost URLs. Use your deployed domain (https://...) or a public tunnel (ngrok/Cloudflare Tunnel), then retry activation.',
          },
        },
        { status: 400 }
      );
    }

    const data = await qontoRequest<any>({
      method: 'POST',
      path: '/v2/payment_links/connections',
      body: {
        partner_callback_url: partnerCallbackUrlStr,
        user_bank_account_id: bankAccountIdStr,
        user_phone_number: phoneNumber,
        user_website_url: websiteUrlStr,
        business_description: description,
      },
    });

    const connectionLocation = String(data?.connection_location || data?.connectionLocation || '');
    const status = String(data?.status || '');

    return NextResponse.json({ ok: true, status: status || null, connection_location: connectionLocation || null, raw: data });
  } catch (e: any) {
    console.error('qonto payment-links connect error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
