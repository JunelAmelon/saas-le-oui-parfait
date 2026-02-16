'use client';

import { auth } from '@/lib/firebase';

export async function sendEmailToUid(params: {
  recipientUid: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) return;

  await fetch('/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  }).catch(() => null);
}

export async function sendEmailToAddress(params: {
  recipientEmail: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) return;

  await fetch('/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  }).catch(() => null);
}
