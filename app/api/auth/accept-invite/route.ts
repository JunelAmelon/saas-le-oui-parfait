import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Invitations maison : jeton valide 7 jours, stocke dans la collection "invites".
// GET  ?token=xxx -> valide le jeton et renvoie l'email associe
// POST {token, password} -> definit le mot de passe du compte et consomme le jeton

async function loadValidInvite(token: string) {
  if (!token) return { error: 'missing_token' as const, status: 400 };
  const snap = await adminDb.collection('invites').doc(token).get();
  if (!snap.exists) return { error: 'invalid' as const, status: 404 };

  const invite = snap.data() as any;
  if (invite.used_at || invite.superseded) {
    return { error: 'used' as const, status: 410 };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: 'expired' as const, status: 410 };
  }
  return { invite, ref: snap.ref };
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token') || '';
    const res = await loadValidInvite(token);
    if ('error' in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json({ ok: true, email: res.invite.email });
  } catch (e: any) {
    console.error('accept-invite GET error:', e);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string; password?: string };
    const token = String(body?.token || '');
    const password = String(body?.password || '');

    if (password.length < 6) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 });
    }

    const res = await loadValidInvite(token);
    if ('error' in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    const { invite, ref } = res;

    await adminAuth.updateUser(invite.uid, {
      password,
      emailVerified: true,
      disabled: false,
    });

    await ref.update({ used_at: new Date().toISOString() });

    // Active le compte pro du prestataire si l'invitation le concerne
    const vendorId = invite?.meta?.vendor_id;
    if (invite.role === 'vendor' && vendorId) {
      try {
        await adminDb.collection('vendors').doc(vendorId).update({
          pro_account_status: 'active',
          updated_at: new Date().toISOString(),
        });
      } catch {
        // non bloquant
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('accept-invite POST error:', e);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
