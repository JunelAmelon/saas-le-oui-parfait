import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Package } from 'lucide-react';

export default function StockInventairePage() {
  return (
    <ComingSoonPage
      title="Inventaire"
      description="Suivez vos niveaux de stock et vos mouvements. Cette fonctionnalité arrive prochainement."
      icon={<Package className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
