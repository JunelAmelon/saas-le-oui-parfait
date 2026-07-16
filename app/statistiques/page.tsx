import { ComingSoonPage } from '@/components/ComingSoonPage';
import { BarChart3 } from 'lucide-react';

export default function StatistiquesPage() {
  return (
    <ComingSoonPage
      title="Statistiques"
      description="Analysez l’activité de votre agence en un coup d’œil. Cette fonctionnalité arrive prochainement."
      icon={<BarChart3 className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
