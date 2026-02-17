import crypto from 'node:crypto';

type QontoAuth =
  | { kind: 'api_key'; login: string; secretKey: string }
  | { kind: 'bearer'; token: string };

function getQontoBaseUrl() {
  return (process.env.QONTO_API_BASE_URL || 'https://thirdparty.qonto.com').replace(/\/$/, '');
}

async function resolveAuth(): Promise<QontoAuth> {
  const bearer = (process.env.QONTO_BEARER_TOKEN || '').trim();
  if (bearer) return { kind: 'bearer', token: bearer };

  // Fallback: server-stored OAuth token in Firestore
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const snap = await adminDb.collection('integrations').doc('qonto').get();
    if (snap.exists) {
      const data = snap.data() as any;
      const accessToken = String(data?.access_token || '').trim();
      if (accessToken) return { kind: 'bearer', token: accessToken };
    }
  } catch {
    // ignore
  }

  const login = (process.env.QONTO_API_LOGIN || '').trim();
  const secretKey = (process.env.QONTO_API_SECRET_KEY || '').trim();
  if (!login || !secretKey) {
    throw new Error('Missing Qonto env vars (QONTO_API_LOGIN/QONTO_API_SECRET_KEY)');
  }
  return { kind: 'api_key', login, secretKey };
}

function buildAuthHeader(auth: QontoAuth) {
  if (auth.kind === 'bearer') return `Bearer ${auth.token}`;
  return `${auth.login}:${auth.secretKey}`;
}

export async function qontoRequest<T>(params: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: any;
}): Promise<T> {
  const baseUrl = getQontoBaseUrl();
  const auth = await resolveAuth();

  const stagingToken = (process.env.QONTO_STAGING_TOKEN || process.env.X_QONTO_STAGING_TOKEN || '').trim();
  const isSandboxLike = /sandbox|staging/i.test(baseUrl);

  const url = new URL(`${baseUrl}${params.path.startsWith('/') ? '' : '/'}${params.path}`);
  if (params.query) {
    Object.entries(params.query).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method: params.method,
    headers: {
      Authorization: buildAuthHeader(auth),
      'Content-Type': 'application/json',
      ...(stagingToken && isSandboxLike ? { 'X-Qonto-Staging-Token': stagingToken } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      (json && (json.error_description || json.error || json.message)) ||
      text ||
      `qonto_http_${res.status}`;
    throw new Error(`Qonto API error (${res.status}): ${msg}`);
  }

  return json as T;
}

export function verifyQontoWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
}) {
  const header = params.signatureHeader || '';
  const matchT = /t=(\d+)/.exec(header);
  const matchV1 = /v1=([0-9a-f]+)/i.exec(header);
  if (!matchT || !matchV1) return { ok: false, reason: 'missing_signature' } as const;

  const ts = Number(matchT[1]);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'invalid_timestamp' } as const;

  const tolerance = params.toleranceSeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) return { ok: false, reason: 'timestamp_out_of_range' } as const;

  const signedPayload = `${ts}.${params.rawBody}`;
  const computed = crypto.createHmac('sha256', params.secret).update(signedPayload).digest('hex');

  const expected = matchV1[1].toLowerCase();
  const actual = computed.toLowerCase();

  // constant-time comparison
  const expectedBuf = Uint8Array.from(Buffer.from(expected, 'utf8'));
  const actualBuf = Uint8Array.from(Buffer.from(actual, 'utf8'));
  if (expectedBuf.length !== actualBuf.length) return { ok: false, reason: 'signature_mismatch' } as const;

  const same = crypto.timingSafeEqual(expectedBuf, actualBuf);
  return same ? ({ ok: true } as const) : ({ ok: false, reason: 'signature_mismatch' } as const);
}
