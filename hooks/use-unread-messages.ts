'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface UseUnreadMessagesOptions {
  role: 'planner' | 'vendor' | 'client';
  id?: string | null;
}

export function useUnreadMessages({ role, id }: UseUnreadMessagesOptions) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!id) {
      setCount(0);
      return;
    }

    const field = role === 'planner' ? 'planner_id' : role === 'vendor' ? 'vendor_id' : 'client_id';
    const unreadField =
      role === 'planner' ? 'unread_count_planner' : role === 'vendor' ? 'unread_count_vendor' : 'unread_count_client';

    const q = query(collection(db, 'conversations'), where(field, '==', id));

    const unsub = onSnapshot(
      q,
      (snap) => {
        let total = 0;
        snap.forEach((d) => {
          const data = d.data() as any;
          total += Number(data?.[unreadField] ?? 0);
        });
        setCount(total);
      },
      () => {
        setCount(0);
      }
    );

    return () => unsub();
  }, [role, id]);

  return count;
}
