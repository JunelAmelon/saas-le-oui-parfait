import { ComingSoonPage } from '@/components/ComingSoonPage';
import { FileText } from 'lucide-react';

export default function ContratsPage() {
  return (
    <ComingSoonPage
      title="Contrats"
      description="Générez et faites signer vos contrats en ligne. Cette fonctionnalité arrive prochainement."
      icon={<FileText className="h-8 w-8 text-brand-turquoise" />}
    />
  );
}
