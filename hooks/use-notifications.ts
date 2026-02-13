'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  where,
  doc,
} from 'firebase/firestore';

export type NotificationType = 'message' | 'document' | 'change_request';

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: any;
}

const toMillis = (v: any): number => {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.toDate === 'function') {
    const d = v.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

export function useNotifications(recipientId?: string, take: number = 20) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recipientId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // NOTE: We intentionally do NOT use orderBy/limit here.
    // Some environments/data-shapes have triggered Firestore internal assertion failures
    // on listen queries combining orderBy + limit. We sort/limit client-side instead.
    const q = query(collection(db, 'notifications'), where('recipient_id', '==', recipientId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: AppNotification[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          next.push({
            id: d.id,
            recipient_id: String(data?.recipient_id || ''),
            type: (data?.type || 'message') as NotificationType,
            title: String(data?.title || ''),
            message: String(data?.message || ''),
            link: data?.link ?? null,
            read: Boolean(data?.read),
            created_at: data?.created_at,
          });
        });
        next.sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at));
        setItems(next.slice(0, take));
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [recipientId, take]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markAsRead = async (notificationId: string) => {
    if (!notificationId) return;
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  };

  const markAllAsRead = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })));
  };

  return { items, unreadCount, loading, markAsRead, markAllAsRead };
}
