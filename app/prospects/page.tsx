import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Users } from 'lucide-react';

export default function ProspectsPage() {
  return (
    <ComingSoonPage
      title="Prospects"
      description="Suivez vos prospects et vos opportunités commerciales. Cette fonctionnalité arrive prochainement."
      icon={<Users className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
