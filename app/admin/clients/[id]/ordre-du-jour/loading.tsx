'use client';

import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoadingOrdreDuJour() {
  return (
    <div className="space-y-6">
      <Card className="p-10 shadow-xl border-0">
        <div className="flex items-center justify-center gap-3 text-brand-gray">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement du planning du jour J...
        </div>
      </Card>
    </div>
  );
}
