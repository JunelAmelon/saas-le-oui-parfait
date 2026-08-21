import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmailServer, sendPushServer } from '@/lib/notifications.server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const body = (await req.json()) as {
      planner_id?: string;
      vendor_name?: string;
      doc_type?: string;
      client_names?: string;
      client_id?: string;
    };

    const plannerId = body.planner_id;
    const vendorName = body.vendor_name || 'Prestataire';
    const docType = body.doc_type === 'facture' ? 'facture' : 'devis';
    const clientNames = body.client_names || 'un mariage';
    const clientId = body.client_id || '';

    if (!plannerId) return NextResponse.json({ error: 'missing_planner_id' }, { status: 400 });

    // In-app notification
    try {
      await adminDb.collection('notifications').add({
        recipient_id: plannerId,
        type: 'vendor_doc',
        title: `${docType === 'devis' ? 'Devis' : 'Facture'} soumis par ${vendorName}`,
        message: `${vendorName} a soumis un ${docType} pour le mariage de ${clientNames}. Vérifiez et validez-le.`,
        link: clientId ? `/admin/clients/${clientId}/facturation-pro` : '/factures',
        read: false,
        created_at: new Date(),
      });
    } catch (e) {
      console.error('Error creating notification:', e);
    }

    // Email
    try {
      const contactEmail = process.env.CONTACT_EMAIL || 'contact@leouiparfait.com';
      if (contactEmail) {
        await sendEmailServer({
          to: contactEmail,
          subject: `${docType === 'devis' ? 'Devis' : 'Facture'} soumis par ${vendorName}`,
          text: `Bonjour,\n\n${vendorName} a soumis un ${docType} pour le mariage de ${clientNames}.\n\nVérifiez et validez ce document dans l'administration.\n\nLe Oui Parfait`,
        });
      }
    } catch (e) {
      console.error('Error sending email:', e);
    }

    // Push
    try {
      await sendPushServer({
        recipientId: plannerId,
        title: `${docType === 'devis' ? 'Devis' : 'Facture'} soumis`,
        body: `${vendorName} a soumis un ${docType} pour ${clientNames}.`,
        link: clientId ? `/admin/clients/${clientId}/facturation-pro` : '/factures',
      });
    } catch (e) {
      console.error('Error sending push:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('vendor-doc-submitted error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
