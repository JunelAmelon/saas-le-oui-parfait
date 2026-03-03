import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidQontoAccessToken, qontoOAuthRequest } from '@/lib/qonto-oauth';

export const runtime = 'nodejs';

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return String(v).trim();
}

function normalizeUrl(raw: string) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme;
}

function isValidHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalhostUrl(raw: string) {
  try {
    const u = new URL(raw);
    const host = String(u.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function resolvePartnerCallbackUrl(req: Request) {
  const explicit = process.env.QONTO_PAYMENT_LINKS_PARTNER_CALLBACK_URL;
  if (explicit) return normalizeUrl(String(explicit).trim());
  const url = new URL(req.url);
  return `${url.origin}/api/qonto/payment-links/onboarding-callback`;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const profileSnap = await adminDb.collection('profiles').doc(uid).get();
    const role = String((profileSnap.data() as any)?.role || '');
    if (role !== 'planner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const phone = requireEnv('QONTO_PAYMENT_LINKS_PHONE');
    const website = normalizeUrl(requireEnv('QONTO_PAYMENT_LINKS_WEBSITE'));
    const businessDescription = requireEnv('QONTO_PAYMENT_LINKS_BUSINESS_DESCRIPTION');

    if (!isValidHttpUrl(website)) {
      return NextResponse.json({ error: 'invalid_website_url' }, { status: 400 });
    }

    const callbackUrl = resolvePartnerCallbackUrl(req);
    if (!isValidHttpUrl(callbackUrl)) {
      return NextResponse.json({ error: 'invalid_partner_callback_url', value: callbackUrl }, { status: 400 });
    }

    // Qonto provider onboarding usually requires a publicly reachable callback URL.
    if (isLocalhostUrl(callbackUrl)) {
      return NextResponse.json(
        {
          error: 'partner_callback_url_must_be_public',
          value: callbackUrl,
          hint: 'Use a public https URL (e.g. via ngrok) for QONTO_PAYMENT_LINKS_PARTNER_CALLBACK_URL.',
        },
        { status: 400 }
      );
    }

    if (businessDescription.length < 20) {
      return NextResponse.json(
        { error: 'business_description_too_short', min_length: 20, current_length: businessDescription.length },
        { status: 400 }
      );
    }

    const { accessToken } = await getValidQontoAccessToken(uid);

    // Fetch org to get a bank account id
    const org = await qontoOAuthRequest<any>({ accessToken, path: '/v2/organization', init: { method: 'GET' } });
    const bankAccounts = org?.organization?.bank_accounts || [];
    const main = bankAccounts.find((a: any) => a?.main) || bankAccounts[0] || null;
    const bankAccountId = String(main?.id || '').trim();
    if (!bankAccountId) return NextResponse.json({ error: 'missing_bank_account_id' }, { status: 400 });

    const payload = {
      partner_callback_url: callbackUrl,
      user_bank_account_id: bankAccountId,
      user_phone_number: phone,
      user_website_url: website,
      business_description: businessDescription,
    };

    try {
      const connection = await qontoOAuthRequest<any>({
        accessToken,
        path: '/v2/payment_links/connections',
        init: {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      });

      return NextResponse.json({ ok: true, ...connection });
    } catch (e: any) {
      const msg = String(e?.message || 'error');
      if (msg.includes('multiple_connections_not_allowed')) {
        const existing = await qontoOAuthRequest<any>({
          accessToken,
          path: '/v2/payment_links/connections',
          init: { method: 'GET' },
        });
        return NextResponse.json({ ok: true, already_connected: true, ...existing });
      }
      throw e;
    }
  } catch (e: any) {
    console.error('qonto payment-links connect error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
