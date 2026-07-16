import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Package } from 'lucide-react';

export default function StockEntrepotsPage() {
  return (
    <ComingSoonPage
      title="Entrepôts"
      description="Organisez vos lieux de stockage et vos emplacements. Cette fonctionnalité arrive prochainement."
      icon={<Package className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
