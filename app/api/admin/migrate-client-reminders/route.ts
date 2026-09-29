import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { calculateScheduledSendDate, reminderDef } from '@/lib/client-reminders';

export const runtime = 'nodejs';

function getAuthOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  return auth.slice('Bearer '.length) === secret;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const parsed = new Date(v.includes('T') ? v : `${v}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return null;
}

async function getWeddingDate(clientId: string): Promise<Date | null> {
  try {
    const eventsSnap = await adminDb
      .collection('events')
      .where('client_id', '==', clientId)
      .limit(5)
      .get();
    const dates = eventsSnap.docs
      .map((d) => toDate((d.data() as any)?.event_date))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates[0]) return dates[0];
  } catch {
    // fallback below
  }

  try {
    const clientSnap = await adminDb.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) return null;
    return toDate((clientSnap.data() as any)?.event_date);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    if (!getAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    // Sécurité: dry_run activé par défaut.
    const dryRun = url.searchParams.get('dry_run') !== '0';
    const now = new Date();

    const snap = await adminDb.collection('client_reminders').get();
    const weddingDateCache = new Map<string, Date | null>();

    const results: Array<{
      id: string;
      clientId: string;
      type: string;
      status: string;
      updates?: Record<string, any>;
    }> = [];

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const id = doc.id;
      const clientId = String(data.client_id || '');
      const type = String(data.type || '');

      if (!clientId || !type) {
        results.push({ id, clientId, type, status: 'skipped_invalid' });
        continue;
      }

      // Les rappels customs restent 100% manuels.
      if (type === 'custom') {
        if (data.schedule_mode !== 'manual') {
          const updates = { schedule_mode: 'manual' };
          if (!dryRun) await doc.ref.update(updates);
          results.push({ id, clientId, type, status: dryRun ? 'dry_run_update' : 'updated', updates });
        } else {
          results.push({ id, clientId, type, status: 'skipped_custom_manual' });
        }
        continue;
      }

      const def = reminderDef(type);
      if (!def) {
        results.push({ id, clientId, type, status: 'skipped_unknown_type' });
        continue;
      }

      if (data.schedule_mode === 'manual') {
        results.push({ id, clientId, type, status: 'skipped_manual' });
        continue;
      }

      if (!weddingDateCache.has(clientId)) {
        weddingDateCache.set(clientId, await getWeddingDate(clientId));
      }
      const weddingDate = weddingDateCache.get(clientId) || null;
      const sentCount = Number(data.sent_count || 0);

      const updates: Record<string, any> = {};

      // Synchronise l'ancienne configuration avec la nouvelle version.
      if (data.label !== def.label) updates.label = def.label;
      if (Number(data.interval_days || 0) !== def.intervalDays) updates.interval_days = def.intervalDays;
      if (data.max_sends !== def.maxSends) updates.max_sends = def.maxSends;
      if (data.schedule_mode !== 'wedding_based') updates.schedule_mode = 'wedding_based';

      const maxSends = def.maxSends;
      if (maxSends !== null && sentCount >= maxSends) {
        if (data.active !== false) updates.active = false;
        if (!data.finished_at) updates.finished_at = now.toISOString();
      } else if (weddingDate && weddingDate < now) {
        if (data.active !== false) updates.active = false;
        if (!data.completed_at) updates.completed_at = now.toISOString();
        if (data.completed_by !== 'auto_wedding_passed') updates.completed_by = 'auto_wedding_passed';
      } else if (!data.completed_at) {
        // Recalcule aussi la relance des rappels déjà partiellement envoyés.
        // Si la date théorique est déjà passée, le helper repousse à J+7 au lieu
        // de provoquer un envoi immédiat pendant la migration.
        const expected = weddingDate
          ? calculateScheduledSendDate(def, weddingDate, sentCount, now).toISOString()
          : null;
        if (expected && String(data.next_send_at || '') !== expected) {
          updates.next_send_at = expected;
        }
      }

      if (Object.keys(updates).length === 0) {
        results.push({ id, clientId, type, status: 'skipped_no_change' });
        continue;
      }

      if (!dryRun) await doc.ref.update(updates);
      results.push({ id, clientId, type, status: dryRun ? 'dry_run_update' : 'updated', updates });
    }

    return NextResponse.json({
      ok: true,
      dry_run: dryRun,
      checked: snap.size,
      updated: results.filter((r) => r.status === 'updated').length,
      dry_run_updates: results.filter((r) => r.status === 'dry_run_update').length,
      skipped: results.filter((r) => r.status.startsWith('skipped')).length,
      details: results,
    });
  } catch (e: any) {
    console.error('migrate-client-reminders error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
