import { adminDb, adminAuth, admin } from './firebase-admin';
import nodemailer from 'nodemailer';
import { buildBrandedEmail } from './email-template';

async function getEmailForUid(uid: string): Promise<string | null> {
    if (!uid) return null;
    try {
        const profileSnap = await adminDb.collection('profiles').doc(uid).get();
        if (profileSnap.exists) return (profileSnap.data() as any)?.email || null;
        const userRecord = await adminAuth.getUser(uid);
        return userRecord.email || null;
    } catch (e) {
        return null;
    }
}

function createTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
}

export async function sendEmailServer(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) {
    const transporter = createTransport();
    if (!transporter) return;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || '';
    const finalHtml = params.html || buildBrandedEmail({
        appName: 'Le Oui Parfait',
        baseUrl,
        title: params.subject,
        text: params.text,
    }).html;

    try {
        await transporter.sendMail({
            from,
            to: params.to,
            subject: params.subject,
            text: params.text,
            html: finalHtml,
        });
    } catch (e) {
        console.warn('Server email send failed:', e);
    }
}

export async function sendPushServer(params: {
    recipientId: string;
    title: string;
    body: string;
    link?: string;
}) {
    try {
        const tokenDoc = await adminDb.collection('push_tokens').doc(`user:${params.recipientId}`).get();
        const fcmToken = tokenDoc.exists ? (tokenDoc.data() as any)?.token : null;
        if (!fcmToken) return;

        await admin.messaging().send({
            token: fcmToken,
            notification: { title: params.title, body: params.body },
            data: { link: params.link || '' },
        });
    } catch (e) {
        console.warn('Server push send failed:', e);
    }
}

/**
 * Envoie les notifications appropriées lorsqu'un paiement est validé (Webhook ou Reconcile..)
 */
export async function handlePaymentSuccessNotifications(invoiceId: string, amount: number) {
    try {
        const invSnap = await adminDb.collection('invoices').doc(invoiceId).get();
        if (!invSnap.exists) return;
        const inv = invSnap.data() as any;
        const clientId = inv?.client_id;
        const plannerId = inv?.planner_id;
        const reference = inv?.reference || 'Facture';

        // 1. Notification pour le CLIENT
        if (clientId) {
            const clientSnap = await adminDb.collection('clients').doc(clientId).get();
            const client = clientSnap.data() as any;
            const clientUserId = client?.client_user_id || clientId;
            const clientEmail = client?.email || client?.client_email || await getEmailForUid(clientUserId);

            // Notification App (Firestore)
            await adminDb.collection('notifications').add({
                recipient_id: clientUserId,
                type: 'payment',
                title: 'Paiement validé ✅',
                message: `Votre paiement de ${amount.toLocaleString('fr-FR')}€ pour la référence ${reference} a bien été reçu.`,
                link: '/espace-client/paiements',
                read: false,
                created_at: new Date(),
                invoice_id: invoiceId,
            });

            // Push
            await sendPushServer({
                recipientId: clientUserId,
                title: 'Paiement validé ✅',
                body: `Nous avons bien reçu votre virement de ${amount.toLocaleString('fr-FR')}€.`,
                link: '/espace-client/paiements',
            });

            // Email
            if (clientEmail) {
                await sendEmailServer({
                    to: clientEmail,
                    subject: 'Confirmation de paiement - Le Oui Parfait',
                    text: `Bonjour,\n\nNous vous confirmons la bonne réception de votre paiement de ${amount.toLocaleString('fr-FR')}€ pour la facture ${reference}.\n\nMerci de votre confiance.`,
                });
            }
        }

        // 2. Notification pour le PLANNER
        if (plannerId) {
            const plannerEmail = await getEmailForUid(plannerId);

            // Notification App (Firestore)
            await adminDb.collection('notifications').add({
                recipient_id: plannerId,
                type: 'payment',
                title: 'Nouveau paiement reçu 💰',
                message: `Un paiement de ${amount.toLocaleString('fr-FR')}€ a été validé pour la facture ${reference}.`,
                link: '/factures',
                read: false,
                created_at: new Date(),
                invoice_id: invoiceId,
            });

            // Push (Planner)
            await sendPushServer({
                recipientId: plannerId,
                title: 'Paiement reçu 💰',
                body: `${amount.toLocaleString('fr-FR')}€ reçus pour la facture ${reference}.`,
                link: '/factures',
            });

            // Email (Planner)
            if (plannerEmail) {
                await sendEmailServer({
                    to: plannerEmail,
                    subject: 'Nouveau paiement Qonto reçu - Le Oui Parfait',
                    text: `Bonjour,\n\nUn virement Qonto de ${amount.toLocaleString('fr-FR')}€ vient d'être matché automatiquement pour la facture ${reference}.\n\nLe statut de la facture a été mis à jour.`,
                });
            }
        }

    } catch (e) {
        console.error('Error handling payment success notifications:', e);
    }
}
