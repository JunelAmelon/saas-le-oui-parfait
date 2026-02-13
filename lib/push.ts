'use client';

import { app, auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const TOKEN_DOC_ID = (userId: string) => `user:${userId}`;
let foregroundInit = false;

export async function initForegroundPushListener() {
  if (foregroundInit) return;
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  const permission = Notification.permission;
  if (permission !== 'granted') return;

  try {
    const { getMessaging, onMessage, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return;

    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      try {
        const title = payload?.notification?.title || 'Notification';
        const body = payload?.notification?.body || '';
        const link = (payload?.data as any)?.link || '';

        const notif = new Notification(title, { body });
        if (link) {
          notif.onclick = () => {
            try {
              window.open(link, '_self');
            } catch {
              // ignore
            }
          };
        }
      } catch (e) {
        console.warn('Foreground push display failed:', e);
      }
    });

    foregroundInit = true;
  } catch (e) {
    console.warn('Unable to init foreground push listener:', e);
  }
}

export async function registerPushToken(userId: string) {
  if (!userId) return { status: 'skipped' as const };

  if (typeof window === 'undefined') return { status: 'skipped' as const };
  if (!('serviceWorker' in navigator)) return { status: 'unsupported' as const };

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { status: 'missing_vapid_key' as const };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' as const };

  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) return { status: 'unsupported' as const };

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(app);

  let token = '';
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (e) {
    console.warn('FCM getToken failed:', e);
    return { status: 'get_token_failed' as const };
  }

  if (!token) return { status: 'no_token' as const };

  await setDoc(
    doc(db, 'push_tokens', TOKEN_DOC_ID(userId)),
    {
      user_id: userId,
      token,
      updated_at: new Date(),
    },
    { merge: true } as any
  );

  await initForegroundPushListener();

  return { status: 'ok' as const, token };
}

export async function sendPushToRecipient(params: {
  recipientId: string;
  title: string;
  body: string;
  link?: string;
}) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) return;

  await fetch('/api/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  }).catch(() => null);
}
