import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Mail } from 'lucide-react';

export default function CampagnesEmailPage() {
  return (
    <ComingSoonPage
      title="Campagnes email"
      description="Créez et envoyez vos campagnes marketing à vos clients et prospects. Cette fonctionnalité arrive prochainement."
      icon={<Mail className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
