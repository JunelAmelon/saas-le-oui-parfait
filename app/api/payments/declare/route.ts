import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmailServer, sendPushServer } from '@/lib/notifications.server';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { invoice_id, amount, transfer_date, transfer_reference, proof_url, client_name } = await request.json();

    if (!invoice_id || !amount || !transfer_date || !transfer_reference || !proof_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const invoiceRef = adminDb.collection('invoices').doc(invoice_id);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceSnap.data();

    if (invoice?.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    if (Math.abs(amount - (invoice?.amount_ttc || 0)) > 0.01) {
      return NextResponse.json(
        { error: 'Amount must match invoice total' },
        { status: 400 }
      );
    }

    const paymentData = {
      invoice_id,
      client_id: invoice?.client_id,
      planner_id: invoice?.planner_id,
      amount,
      method: 'bank_transfer',
      source: 'client_declared',
      status: 'pending',
      transfer_date,
      transfer_reference,
      proof_url,
      declared_at: Timestamp.now(),
      created_at: Timestamp.now(),
    };

    const paymentRef = await adminDb.collection('payments').add(paymentData);

    await invoiceRef.update({
      status: 'payment_pending',
      updated_at: Timestamp.now(),
    });

    // Notification in-app et email à l'admin
    try {
      const plannerId = invoice?.planner_id;

      // Notification dans l'application admin
      await adminDb.collection('notifications').add({
        recipient_id: plannerId,
        type: 'payment',
        title: 'Virement à valider',
        message: `${client_name || 'Un client'} a déclaré un virement de ${amount.toLocaleString('fr-FR')}€ pour la facture ${invoice?.number}. Vérifiez et validez le paiement.`,
        link: '/factures',
        read: false,
        created_at: new Date(),
        invoice_id,
        payment_id: paymentRef.id,
      });

      const emailText = `Bonjour,\n\n${client_name || 'Un client'} a déclaré un virement bancaire pour la facture ${invoice?.number}.\n\nMontant : ${amount.toLocaleString('fr-FR')}€\nDate du virement : ${transfer_date}\nRéférence : ${transfer_reference}\nJustificatif : ${proof_url}\n\nVeuillez vérifier le virement et valider le paiement dans l'administration.\n\nLe Oui Parfait`;

      await sendEmailServer({
        to: 'contact@leouiparfait.com',
        subject: `Virement à valider - ${invoice?.number}`,
        text: emailText,
      });

      // Notification push vers le téléphone du planner
      if (plannerId) {
        await sendPushServer({
          recipientId: plannerId,
          title: 'Virement à valider',
          body: `${client_name || 'Un client'} a déclaré un virement de ${amount.toLocaleString('fr-FR')}€ pour la facture ${invoice?.number}.`,
          link: '/factures',
        });
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Ne pas bloquer la réponse si l'email échoue
    }

    return NextResponse.json({
      success: true,
      payment_id: paymentRef.id,
      message: 'Payment declared successfully. Waiting for validation.',
    });
  } catch (error) {
    console.error('Payment declaration error:', error);
    return NextResponse.json(
      { error: 'Failed to declare payment' },
      { status: 500 }
    );
  }
}
