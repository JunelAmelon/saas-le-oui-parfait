import crypto from 'node:crypto';

type QontoAuth =
  | { kind: 'api_key'; login: string; secretKey: string }
  | { kind: 'bearer'; token: string };

function getQontoBaseUrl() {
  return (process.env.QONTO_API_BASE_URL || 'https://thirdparty.qonto.com').replace(/\/$/, '');
}

function envAny(names: string[]) {
  for (const n of names) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
}

async function refreshAccessTokenIfNeeded(params: {
  oauthBaseOrigin: string;
  refreshToken: string;
}) {
  const clientId = envAny(['QONTO_OAUTH_CLIENT_ID', 'QONTO_CLIENT_ID']);
  const clientSecret = envAny(['QONTO_OAUTH_CLIENT_SECRET', 'QONTO_CLIENT_SECRET']);
  if (!clientId || !clientSecret) {
    throw new Error('Missing Qonto OAuth env vars (QONTO_OAUTH_CLIENT_ID/QONTO_OAUTH_CLIENT_SECRET)');
  }

  const stagingToken = (process.env.QONTO_STAGING_TOKEN || process.env.X_QONTO_STAGING_TOKEN || '').trim();
  const isSandboxLike = /sandbox|staging/i.test(params.oauthBaseOrigin);

  const tokenUrl = `${params.oauthBaseOrigin.replace(/\/$/, '')}/oauth2/token`;
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  form.set('refresh_token', params.refreshToken);

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...(stagingToken && isSandboxLike ? { 'X-Qonto-Staging-Token': stagingToken } : {}),
    },
    body: form.toString(),
  });

  const text = await resp.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!resp.ok) {
    const msg = (json && (json.error_description || json.error || json.message)) || text || `http_${resp.status}`;
    throw new Error(`Qonto OAuth refresh failed (${resp.status}): ${msg}`);
  }

  const accessToken = String(json?.access_token || '').trim();
  const refreshToken = String(json?.refresh_token || '').trim();
  const scope = String(json?.scope || '').trim();
  const expiresIn = Number(json?.expires_in || 0);
  if (!accessToken) throw new Error('Qonto OAuth refresh returned no access_token');

  return {
    accessToken,
    refreshToken: refreshToken || null,
    scope: scope || null,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
  };
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
      const refreshToken = String(data?.refresh_token || '').trim();
      const expiresIn = Number(data?.expires_in || 0);
      const obtainedAtIso = String(data?.obtained_at || data?.updated_at || '').trim();

      const oauthBaseRaw = (process.env.QONTO_OAUTH_BASE_URL || '').trim();
      const oauthBaseOrigin = oauthBaseRaw ? new URL(oauthBaseRaw).origin : '';

      const now = Date.now();
      const obtainedAt = obtainedAtIso ? Date.parse(obtainedAtIso) : NaN;
      const hasExpiry = Number.isFinite(expiresIn) && expiresIn > 0 && Number.isFinite(obtainedAt);
      const expiresAt = hasExpiry ? obtainedAt + expiresIn * 1000 : NaN;
      const shouldRefresh = hasExpiry ? now > expiresAt - 2 * 60 * 1000 : false; // refresh 2min early

      if (accessToken && !shouldRefresh) {
        return { kind: 'bearer', token: accessToken };
      }

      if (refreshToken && oauthBaseOrigin) {
        const refreshed = await refreshAccessTokenIfNeeded({ oauthBaseOrigin, refreshToken });
        await adminDb.collection('integrations').doc('qonto').set(
          {
            access_token: refreshed.accessToken,
            refresh_token: refreshed.refreshToken,
            scope: refreshed.scope,
            expires_in: refreshed.expiresIn,
            obtained_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
        return { kind: 'bearer', token: refreshed.accessToken };
      }

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
