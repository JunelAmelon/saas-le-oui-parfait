'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getClientPayments, PaymentData } from '@/lib/client-helpers';
import { Loader2 } from 'lucide-react';

interface PaymentsProps {
  eventId: string;
  clientId?: string;
}

export function ClientPayments({ eventId, clientId }: PaymentsProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      if (clientId) {
        try {
          const items = await getClientPayments(clientId);
          setPayments(items);
        } catch (error) {
          console.error('Error fetching payments', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [clientId]);

  if (loading) {
    return (
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
        <div className="flex justify-center p-4">
          <Loader2 className="animate-spin h-5 w-5 text-[#88b7b5]" />
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
        <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
          <Euro className="h-5 w-5 text-[#88b7b5]" />
          Paiements
        </h3>
        <div className="text-sm text-[#9C97A3] italic text-center p-4">Aucun paiement enregistré pour le moment.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5 sm:p-6">
      <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
        <Euro className="h-5 w-5 text-[#88b7b5]" />
        Paiements
      </h3>
      <div className="space-y-2.5">
        {payments.slice(0, 5).map((payment) => (
          <div
            key={payment.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#FAF9F7]"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#4B4456] text-sm truncate">{payment.description}</p>
              <p className="text-xs text-[#9C97A3]">
                {(payment.status === 'paid' || payment.status === 'completed') && payment.date
                  ? `Payé le ${payment.date}`
                  : payment.due_date
                  ? `Échéance: ${payment.due_date}`
                  : 'Date non définie'}
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right">
              <p className="text-base font-bold text-[#4B4456]">{payment.amount.toLocaleString('fr-FR')} €</p>
              {payment.status === 'paid' || payment.status === 'completed' ? (
                <Badge className="bg-[rgba(136,183,181,0.16)] text-[#6a9a98] hover:bg-[rgba(136,183,181,0.16)] text-[10.5px]">
                  Payé
                </Badge>
              ) : (
                <Badge className="bg-[#F3E3E6] text-[#B98A96] hover:bg-[#F3E3E6] text-[10.5px]">
                  En attente
                </Badge>
              )}
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          className="w-full rounded-xl border border-[rgba(75,68,86,0.12)] bg-white text-[#4B4456] hover:bg-[#FAF9F7] hover:text-[#4B4456] mt-1 h-10 text-sm"
          onClick={() => router.push('/espace-client/paiements')}
        >
          Effectuer un paiement
        </Button>
      </div>
    </div>
  );
}
