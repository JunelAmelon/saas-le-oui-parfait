import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Flower2 } from 'lucide-react';

export default function FleursAdminPage() {
  return (
    <ComingSoonPage
      title="Composition florale"
      description="Créez et partagez vos compositions florales avec vos clients. Cette fonctionnalité arrive prochainement."
      icon={<Flower2 className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
