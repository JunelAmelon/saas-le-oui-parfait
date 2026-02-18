export type QontoBankAccount = {
  iban: string;
  bic?: string;
  name?: string;
  main?: boolean;
};

export type QontoOrganizationResponse = {
  organization: {
    id: string;
    slug: string;
    bank_accounts?: QontoBankAccount[];
  };
};

export type QontoTransaction = {
  transaction_id?: string;
  id?: string;
  amount: number;
  amount_cents: number;
  side: 'credit' | 'debit';
  status: 'pending' | 'declined' | 'completed' | string;
  currency?: string;
  local_currency?: string;
  label?: string;
  note?: string;
  reference?: string | null;
  settled_at?: string;
  emitted_at?: string;
  updated_at?: string;
};

function getBaseUrl() {
  const env = String(process.env.QONTO_ENV || '').trim().toLowerCase();
  const stagingToken = String(process.env.X_QONTO_STAGING_TOKEN || process.env.QONTO_STAGING_TOKEN || '').trim();
  const isSandbox = env === 'sandbox' || Boolean(stagingToken);

  // Sandbox uses a different host
  if (isSandbox) return 'https://thirdparty-sandbox.staging.qonto.co';

  return 'https://thirdparty.qonto.com';
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeEnvValue(v: string | undefined) {
  if (!v) return '';
  const trimmed = String(v).trim();
  // Strip surrounding quotes commonly found in .env files
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return unquoted.trim();
}

function buildHeaders() {
  const login = normalizeEnvValue(process.env.QONTO_API_LOGIN || process.env.QONTO_LOGIN);
  const secret = normalizeEnvValue(process.env.QONTO_API_SECRET || process.env.QONTO_SECRET);

  if (!login || !secret) {
    throw new Error(
      'Missing Qonto API key env vars (expected QONTO_API_LOGIN + QONTO_API_SECRET). ' +
        'If you changed .env.local, restart the dev server.'
    );
  }

  const headers: Record<string, string> = {
    Authorization: `${login}:${secret}`,
    'Content-Type': 'application/json',
  };

  const stagingToken = normalizeEnvValue(
    process.env.X_QONTO_STAGING_TOKEN || process.env.QONTO_STAGING_TOKEN || process.env.QONTO_X_QONTO_STAGING_TOKEN
  );
  if (stagingToken) {
    headers['X-Qonto-Staging-Token'] = stagingToken;
  }

  return headers;
}

export async function qontoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');
    const detail = typeof body === 'string' ? body.slice(0, 500) : JSON.stringify(body);
    throw new Error(`Qonto API error ${res.status}: ${detail}`);
  }

  if (!isJson) {
    const text = await res.text();
    throw new Error(`Unexpected Qonto response (non-JSON): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

export async function getQontoOrganization(): Promise<QontoOrganizationResponse> {
  return qontoRequest<QontoOrganizationResponse>('/v2/organization', { method: 'GET' });
}

export async function getMainBankAccount(): Promise<QontoBankAccount> {
  const org = await getQontoOrganization();
  const accounts = org.organization?.bank_accounts || [];
  const main = accounts.find((a) => a?.main) || accounts[0];
  if (!main?.iban) throw new Error('No bank account IBAN found on Qonto organization');
  return main;
}

export async function listTransactions(params: {
  iban: string;
  side?: 'credit' | 'debit';
  status?: 'completed' | 'pending' | 'declined';
  updated_at?: string;
  updated_at_to?: string;
  per_page?: number;
}): Promise<{ transactions: QontoTransaction[] }> {
  const qp = new URLSearchParams();
  qp.set('iban', params.iban);
  if (params.side) qp.set('side', params.side);
  if (params.status) qp.set('status', params.status);
  if (params.updated_at) qp.set('updated_at', params.updated_at);
  if (params.updated_at_to) qp.set('updated_at_to', params.updated_at_to);
  qp.set('per_page', String(params.per_page || 100));

  return qontoRequest<{ transactions: QontoTransaction[] }>(`/v2/transactions?${qp.toString()}`, { method: 'GET' });
}

export function buildPrettyTransferReference(params: { invoiceId: string; invoiceReference?: string }) {
  const base = String(params.invoiceReference || '').trim();
  const prettyBase = base
    ? base
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 16)
    : 'FACT';

  const tail = params.invoiceId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `LOP-${prettyBase}-${tail}`;
}
