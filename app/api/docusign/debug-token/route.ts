import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getDocuSignAccessToken, getDocuSignEnv } from '@/lib/docusign';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const unsafe = url.searchParams.get('unsafe') === '1';
  const isProd = process.env.NODE_ENV === 'production';

  let env:
    | {
        integrationKey: string;
        userId: string;
        accountId: string;
        basePath: string;
        authServer: string;
        privateKey: string;
      }
    | null = null;
  let publicKeyFingerprint: string | null = null;
  let publicKeyPemForDebug: string | null = null;

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) {
      if (unsafe && !isProd) {
        // Dev-only bypass for debugging DocuSign env/JWT.
      } else {
        return NextResponse.json({ error: 'missing_auth' }, { status: 401 });
      }
    } else {
      await adminAuth.verifyIdToken(token);
    }

    env = getDocuSignEnv();
    const keyObject = crypto.createPrivateKey({ key: env.privateKey, format: 'pem' });
    const publicKeyPem = crypto.createPublicKey(keyObject).export({ format: 'pem', type: 'spki' }).toString();
    publicKeyFingerprint = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
    if (unsafe && !isProd) {
      publicKeyPemForDebug = publicKeyPem;
    }

    const accessToken = await getDocuSignAccessToken();
    return NextResponse.json({
      ok: true,
      tokenPreview: `${accessToken.slice(0, 12)}...`,
      unsafe,
      isProd,
      integrationKey: env.integrationKey,
      userId: env.userId,
      accountId: env.accountId,
      basePath: env.basePath,
      authServer: env.authServer,
      publicKeyFingerprint,
      publicKeyPem: publicKeyPemForDebug,
    });
  } catch (e: any) {
    try {
      env = env || getDocuSignEnv();
      if (!publicKeyFingerprint) {
        const keyObject = crypto.createPrivateKey({ key: env.privateKey, format: 'pem' });
        const publicKeyPem = crypto.createPublicKey(keyObject).export({ format: 'pem', type: 'spki' }).toString();
        publicKeyFingerprint = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
        if (unsafe && !isProd) {
          publicKeyPemForDebug = publicKeyPem;
        }
      }
    } catch {
      // ignore
    }

    const message = String(e?.message || 'error');
    return NextResponse.json(
      {
        ok: false,
        error: message,
        errorCode: e?.code,
        errorType: e?.name,
        unsafe,
        isProd,
        integrationKey: env?.integrationKey,
        userId: env?.userId,
        accountId: env?.accountId,
        basePath: env?.basePath,
        authServer: env?.authServer,
        publicKeyFingerprint,
        publicKeyPem: publicKeyPemForDebug,
      },
      { status: 500 }
    );
  }
}
