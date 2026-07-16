import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Package } from 'lucide-react';

export default function StockFournisseursPage() {
  return (
    <ComingSoonPage
      title="Fournisseurs"
      description="Centralisez vos fournisseurs et leurs catalogues. Cette fonctionnalité arrive prochainement."
      icon={<Package className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
