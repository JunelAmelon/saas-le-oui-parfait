import crypto from 'node:crypto';

export type DocuSignEnv = {
  integrationKey: string;
  userId: string;
  accountId: string;
  basePath: string; // e.g. https://demo.docusign.net/restapi
  authServer: string; // e.g. account-d.docusign.com
  privateKey: string; // PEM
};

function requireEnv(name: string, value?: string) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getDocuSignEnv(): DocuSignEnv {
  const rawKey = requireEnv('DOCUSIGN_PRIVATE_KEY', process.env.DOCUSIGN_PRIVATE_KEY);
  const normalizedKey = String(rawKey)
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (!/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(normalizedKey)) {
    throw new Error('Invalid DOCUSIGN_PRIVATE_KEY format (expected PEM with BEGIN/END PRIVATE KEY)');
  }

  return {
    integrationKey: requireEnv('DOCUSIGN_INTEGRATION_KEY', process.env.DOCUSIGN_INTEGRATION_KEY),
    userId: requireEnv('DOCUSIGN_USER_ID', process.env.DOCUSIGN_USER_ID),
    accountId: requireEnv('DOCUSIGN_ACCOUNT_ID', process.env.DOCUSIGN_ACCOUNT_ID),
    basePath: requireEnv('DOCUSIGN_BASE_PATH', process.env.DOCUSIGN_BASE_PATH),
    authServer: requireEnv('DOCUSIGN_AUTH_SERVER', process.env.DOCUSIGN_AUTH_SERVER),
    privateKey: normalizedKey,
  };
}

let cachedToken: { token: string; expMs: number } | null = null;

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwtRs256(params: {
  payload: Record<string, any>;
  privateKeyPem: string;
}) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(params.payload));
  const data = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  let keyObject: crypto.KeyObject;
  try {
    const pem = String(params.privateKeyPem);
    const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(pem);
    const isPkcs8 = /BEGIN PRIVATE KEY/.test(pem);

    if (isPkcs1) {
      keyObject = crypto.createPrivateKey({ key: pem, format: 'pem', type: 'pkcs1' });
    } else if (isPkcs8) {
      keyObject = crypto.createPrivateKey({ key: pem, format: 'pem', type: 'pkcs8' });
    } else {
      // Fallback
      keyObject = crypto.createPrivateKey({ key: pem, format: 'pem' });
    }
  } catch (e: any) {
    throw new Error(
      `DocuSign private key parse error: ${e?.message || 'invalid_key'} (check PEM header and ensure the key is not encrypted)`
    );
  }

  let signature: Buffer;
  try {
    signature = sign.sign(keyObject);
  } catch (e: any) {
    throw new Error(`DocuSign JWT signature error: ${e?.message || 'sign_failed'}`);
  }
  const sigB64 = base64UrlEncode(signature);
  return `${data}.${sigB64}`;
}

export async function getDocuSignAccessToken(): Promise<string> {
  const env = getDocuSignEnv();

  if (cachedToken && Date.now() < cachedToken.expMs - 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwtRs256({
    payload: {
      iss: env.integrationKey,
      sub: env.userId,
      aud: env.authServer,
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation',
    },
    privateKeyPem: env.privateKey,
  });

  const tokenUrl = `https://${env.authServer}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(json?.error_description || json?.error || 'DocuSign token error');
  }

  const accessToken = String(json.access_token || '');
  const expiresIn = Number(json.expires_in || 3600);
  cachedToken = { token: accessToken, expMs: Date.now() + expiresIn * 1000 };
  return accessToken;
}

export async function docusignRequest<T>(params: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
}) {
  const env = getDocuSignEnv();
  const token = await getDocuSignAccessToken();
  const url = `${env.basePath.replace(/\/$/, '')}${params.path}`;

  const res = await fetch(url, {
    method: params.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(json?.message || json?.error_description || 'DocuSign API error');
  }
  return json as T;
}

export async function fetchPdfAsBase64(pdfUrl: string) {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error('Unable to fetch PDF');
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}

export async function downloadSignedCombinedPdf(envelopeId: string) {
  const env = getDocuSignEnv();
  const token = await getDocuSignAccessToken();
  const url = `${env.basePath.replace(/\/$/, '')}/v2.1/accounts/${env.accountId}/envelopes/${envelopeId}/documents/combined`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
    },
  });
  if (!res.ok) throw new Error('Unable to download signed PDF');
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadPdfBufferToCloudinary(params: { buffer: Buffer; filename: string }) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error('Missing Cloudinary env vars');

  const form = new FormData();
  // Node Buffer isn't always assignable to BlobPart in TS lib dom typings.
  const bytes = new Uint8Array(params.buffer);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  form.append('file', blob, `${params.filename}.pdf`);
  form.append('upload_preset', preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Cloudinary upload failed');
  }
  return String(json.secure_url || '');
}
