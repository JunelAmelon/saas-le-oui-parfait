import { adminDb } from '@/lib/firebase-admin';

type StoredTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: string; // ISO
  scope?: string;
  token_type?: string;
  updated_at: string; // ISO
};

function nowIso() {
  return new Date().toISOString();
}

function msUntilExpiry(expiresAtIso: string) {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  return Number.isFinite(ms) ? ms : -1;
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  const trimmed = String(v).trim();
  // Strip surrounding quotes commonly found in .env files
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return unquoted.trim();
}

function getOAuthBaseUrl() {
  const env = String(process.env.QONTO_ENV || '').trim().toLowerCase();
  const stagingToken = String(process.env.X_QONTO_STAGING_TOKEN || process.env.QONTO_STAGING_TOKEN || '').trim();
  const isSandbox = env === 'sandbox' || Boolean(stagingToken);
  return isSandbox ? 'https://oauth-sandbox.staging.qonto.co' : 'https://oauth.qonto.com';
}

function getNormalizedStagingToken() {
  const raw =
    process.env.X_QONTO_STAGING_TOKEN ||
    process.env.QONTO_STAGING_TOKEN ||
    process.env.QONTO_X_QONTO_STAGING_TOKEN ||
    '';
  const trimmed = String(raw).trim();
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return unquoted.trim();
}

function getApiBaseUrl() {
  const env = String(process.env.QONTO_ENV || '').trim().toLowerCase();
  const stagingToken = String(process.env.X_QONTO_STAGING_TOKEN || process.env.QONTO_STAGING_TOKEN || '').trim();
  const isSandbox = env === 'sandbox' || Boolean(stagingToken);
  return isSandbox ? 'https://thirdparty-sandbox.staging.qonto.co' : 'https://thirdparty.qonto.com';
}

export function buildQontoAuthorizeUrl(params: { redirectUri: string; state: string; scope: string }) {
  const clientId = requireEnv('QONTO_OAUTH_CLIENT_ID');
  const base = `${getOAuthBaseUrl()}/oauth2/auth`;
  const qp = new URLSearchParams();
  qp.set('response_type', 'code');
  qp.set('client_id', clientId);
  qp.set('redirect_uri', String(params.redirectUri || '').trim());
  qp.set('scope', params.scope);
  qp.set('state', params.state);
  return `${base}?${qp.toString()}`;
}

async function tokenRequest(body: Record<string, string>) {
  const clientId = requireEnv('QONTO_OAUTH_CLIENT_ID');
  const clientSecret = requireEnv('QONTO_OAUTH_CLIENT_SECRET');

  const isSandbox = getOAuthBaseUrl().includes('oauth-sandbox');
  const stagingToken = getNormalizedStagingToken();

  const form = new URLSearchParams();
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  for (const [k, v] of Object.entries(body)) form.set(k, v);

  const res = await fetch(`${getOAuthBaseUrl()}/oauth2/token`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...(isSandbox && stagingToken ? { 'X-Qonto-Staging-Token': stagingToken } : {}),
    },
    body: form.toString(),
    cache: 'no-store',
  });

  // If Qonto responds with a redirect (common when hitting the wrong environment or invalid client), surface it.
  const location = res.headers.get('location') || '';
  if (res.status >= 300 && res.status < 400) {
    throw new Error(
      `Qonto OAuth token error ${res.status}: redirected_to=${location || '(empty)'} oauth_base=${getOAuthBaseUrl()}`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let payload: any = null;
  if (isJson) {
    payload = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => '');
    payload = text;
  }

  if (!res.ok) {
    const detail = typeof payload === 'string' ? payload.slice(0, 500) : JSON.stringify(payload);
    throw new Error(`Qonto OAuth token error ${res.status}: ${detail} oauth_base=${getOAuthBaseUrl()}`);
  }

  if (!isJson || !payload || typeof payload !== 'object') {
    const detail = typeof payload === 'string' ? payload.slice(0, 200) : String(payload);
    throw new Error(
      `Qonto OAuth token error: unexpected response (non-JSON): ${detail} oauth_base=${getOAuthBaseUrl()}`
    );
  }

  if (!payload.access_token || !payload.expires_in) {
    throw new Error(`Qonto OAuth token error: missing fields in response: ${JSON.stringify(payload).slice(0, 500)}`);
  }

  return payload as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
}

export async function exchangeAuthorizationCode(params: { code: string; redirectUri: string }) {
  const token = await tokenRequest({
    grant_type: 'authorization_code',
    // Qonto docs mention `authorization_code`, but some OAuth servers expect the standard `code` field.
    // Send both to maximize compatibility across environments.
    code: params.code,
    authorization_code: params.code,
    redirect_uri: params.redirectUri,
  });

  const expiresAt = new Date(Date.now() + Math.max(0, Number(token.expires_in || 0)) * 1000).toISOString();
  return { ...token, expires_at: expiresAt };
}

export async function refreshAccessToken(params: { refreshToken: string }) {
  const token = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
  });

  const expiresAt = new Date(Date.now() + Math.max(0, Number(token.expires_in || 0)) * 1000).toISOString();
  return { ...token, expires_at: expiresAt };
}

function integrationDocRef(plannerId: string) {
  return adminDb.collection('integrations').doc(plannerId);
}

export async function storeQontoTokens(plannerId: string, tokens: { access_token: string; refresh_token?: string; expires_at: string; scope?: string; token_type?: string }) {
  const data: StoredTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    scope: tokens.scope,
    token_type: tokens.token_type,
    updated_at: nowIso(),
  };

  await integrationDocRef(plannerId).set(
    {
      qonto_oauth: data,
    },
    { merge: true }
  );
}

export async function getStoredQontoTokens(plannerId: string): Promise<StoredTokens | null> {
  const snap = await integrationDocRef(plannerId).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  const t = data?.qonto_oauth;
  if (!t?.access_token || !t?.expires_at) return null;
  return t as StoredTokens;
}

export async function getValidQontoAccessToken(plannerId: string): Promise<{ accessToken: string; refreshed: boolean }> {
  const stored = await getStoredQontoTokens(plannerId);
  if (!stored) throw new Error('qonto_oauth_not_connected');

  // refresh if expires soon
  const ms = msUntilExpiry(stored.expires_at);
  const needsRefresh = ms < 60_000;

  if (!needsRefresh) return { accessToken: stored.access_token, refreshed: false };

  const refreshToken = String(stored.refresh_token || '').trim();
  if (!refreshToken) throw new Error('qonto_oauth_missing_refresh_token');

  const refreshed = await refreshAccessToken({ refreshToken });

  // Important: store the NEW refresh_token (old one is invalidated)
  await storeQontoTokens(plannerId, {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || refreshToken,
    expires_at: refreshed.expires_at,
    scope: refreshed.scope,
    token_type: refreshed.token_type,
  });

  return { accessToken: refreshed.access_token, refreshed: true };
}

export async function qontoOAuthRequest<T>(params: { accessToken: string; path: string; init?: RequestInit }): Promise<T> {
  const url = `${getApiBaseUrl()}${params.path.startsWith('/') ? '' : '/'}${params.path}`;

  const isSandbox = getApiBaseUrl().includes('thirdparty-sandbox');
  const stagingToken = getNormalizedStagingToken();

  const res = await fetch(url, {
    ...params.init,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(isSandbox && stagingToken ? { 'X-Qonto-Staging-Token': stagingToken } : {}),
      ...(params.init?.headers || {}),
    },
    cache: 'no-store',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');
    const detail = typeof body === 'string' ? body.slice(0, 500) : JSON.stringify(body);
    throw new Error(`Qonto API (OAuth) error ${res.status}: ${detail}`);
  }

  if (!isJson) {
    const text = await res.text();
    throw new Error(`Unexpected Qonto response (non-JSON): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}
