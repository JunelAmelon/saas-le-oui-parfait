import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getMainBankAccount, listTransactions } from '@/lib/qonto';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 20)));

    const bankAccount = await getMainBankAccount();

    const updatedAtFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const txRes = await listTransactions({
      iban: bankAccount.iban,
      side: 'credit',
      updated_at: updatedAtFrom,
      per_page: limit,
    });

    return NextResponse.json({
      ok: true,
      iban: bankAccount.iban,
      count: Array.isArray(txRes?.transactions) ? txRes.transactions.length : 0,
      transactions: txRes?.transactions || [],
    });
  } catch (e: any) {
    console.error('qonto transactions error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
