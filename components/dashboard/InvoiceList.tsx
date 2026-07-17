'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateInvoiceModal } from '@/components/modals/CreateInvoiceModal';
import { Invoice, InvoiceStatus } from '@/types/invoice';

interface InvoiceListProps {
  invoices: Invoice[];
  onInvoiceCreated: () => void;
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Brouillon', className: 'bg-gray-400 hover:bg-gray-500' },
  sent: { label: 'Validée', className: 'bg-[#C4A26A] hover:bg-[#B59260]' },
  payment_pending: { label: 'Non payée', className: 'bg-red-400 hover:bg-red-500' },
  paid: { label: 'Payée', className: 'bg-emerald-600 hover:bg-emerald-700' },
  overdue: { label: 'En retard', className: 'bg-red-500 hover:bg-red-600' },
  cancelled: { label: 'Annulée', className: 'bg-gray-500 hover:bg-gray-600' },
};

export function InvoiceList({ invoices, onInvoiceCreated }: InvoiceListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <Card className="p-6 shadow-xl border-0">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-gray-dark"></h3>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucune facture pour le moment</p>
          ) : (
            invoices.map((invoice) => {
              const config = statusConfig[invoice.status] ?? statusConfig.draft;
              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-[#E5E5E5] p-3 transition-colors hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-brand-gray">
                    {invoice.number}
                  </span>
                  <Badge className={`${config.className} text-white border-0`}>
                    {config.label}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <CreateInvoiceModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          onInvoiceCreated();
        }}
      />
    </>
  );
}
