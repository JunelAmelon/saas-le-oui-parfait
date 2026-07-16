import { ComingSoonPage } from '@/components/ComingSoonPage';
import { FileText } from 'lucide-react';

export default function DevisPage() {
  return (
    <ComingSoonPage
      title="Devis et facturation"
      description="Gérez vos devis, factures et contrats clients en un seul endroit. Cette fonctionnalité arrive prochainement."
      icon={<FileText className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
