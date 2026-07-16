import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Package } from 'lucide-react';

export default function StockArticlesPage() {
  return (
    <ComingSoonPage
      title="Articles en stock"
      description="Gérez votre catalogue d’articles et de matériel. Cette fonctionnalité arrive prochainement."
      icon={<Package className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
