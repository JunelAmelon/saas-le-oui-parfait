'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDocuments } from '@/lib/db';
import { Loader2 } from 'lucide-react';

interface PaymentsProps {
    eventId: string;
}

interface PaymentItem {
    id: string;
    description: string;
    amount: number;
    status: 'paid' | 'pending';
    date: string; // Payment date or Due date
}

export function ClientPayments({ eventId }: PaymentsProps) {
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPayments() {
            if (eventId) {
                try {
                    const items = await getDocuments('events/' + eventId + '/payments', []);
                    setPayments(items.map((item: any) => ({
                        id: item.id,
                        description: item.description,
                        amount: item.amount,
                        status: item.status,
                        date: item.date
                    })));
                } catch (error) {
                    console.error("Error fetching payments", error);
                } finally {
                    setLoading(false);
                }
            }
        }

        fetchPayments();
    }, [eventId]);

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-brand-turquoise" /></div>;
    }

    if (payments.length === 0) {
        return (
            <Card className="p-6 shadow-xl border-0">
                <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                    <Euro className="h-6 w-6 text-brand-turquoise" />
                    Paiements
                </h3>
                <div className="text-gray-500 italic text-center p-4">Aucun paiement enregistré pour le moment.</div>
            </Card>
        );
    }

    return (
        <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Euro className="h-6 w-6 text-brand-turquoise" />
                Paiements
            </h3>
            <div className="space-y-3">
                {payments.map((payment) => (
                    <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                    >
                        <div className="flex-1">
                            <p className="font-medium text-brand-purple text-sm mb-1">
                                {payment.description}
                            </p>
                            <p className="text-xs text-brand-gray">
                                {payment.status === 'paid' ? `Payé le ${new Date(payment.date).toLocaleDateString()}` : `Échéance: ${new Date(payment.date).toLocaleDateString()}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-brand-purple">
                                {payment.amount.toLocaleString()} €
                            </p>
                            {payment.status === 'paid' ? (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                    Payé
                                </Badge>
                            ) : (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                    En attente
                                </Badge>
                            )}
                        </div>
                    </div>
                ))}
                {/* Placeholder functionality */}
                <Button
                    variant="outline"
                    className="w-full border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                    onClick={() => alert("Fonctionnalité de paiement en ligne bientôt disponible")}
                >
                    Effectuer un paiement
                </Button>
            </div>
        </Card>
    );
}
