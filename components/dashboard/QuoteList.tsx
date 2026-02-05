import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Quote {
  id: string;
  reference: string;
  status: 'sent' | 'accepted' | 'rejected';
}

interface QuoteListProps {
  quotes: Quote[];
}

const statusConfig = {
  sent: { label: 'Envoyé', className: 'bg-[#C4A26A] hover:bg-[#B59260]' },
  accepted: { label: 'Validé', className: 'bg-green-500 hover:bg-green-600' },
  rejected: { label: 'Refusé', className: 'bg-red-500 hover:bg-red-600' },
};

export function QuoteList({ quotes }: QuoteListProps) {
  return (
    <Card className="p-6 shadow-xl border-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-gray-dark">Devis</h3>
        <Button
          size="icon"
          className="h-8 w-8 rounded-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {quotes.map((quote) => {
          const config = statusConfig[quote.status];
          return (
            <div
              key={quote.id}
              className="flex items-center justify-between rounded-lg border border-[#E5E5E5] p-3 transition-colors hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-brand-gray">
                {quote.reference}
              </span>
              <Badge className={`${config.className} text-white border-0`}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
