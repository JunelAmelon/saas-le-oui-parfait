import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Users } from 'lucide-react';

export default function ProspectsArchivesPage() {
  return (
    <ComingSoonPage
      title="Archives prospects"
      description="Consultez l’historique de vos prospects. Cette fonctionnalité arrive prochainement."
      icon={<Users className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
