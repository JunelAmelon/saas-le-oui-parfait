import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Eye, Download, Edit, CheckCircle, Clock } from 'lucide-react';

const contratsDemo = [
  {
    id: '1',
    reference: 'CONT-2024-005',
    title: 'Contrat de prestationWedding Planning Premium',
    client: 'Julie & Frédérick',
    type: 'service_contract',
    amount: 8000,
    status: 'signed',
    createdAt: '15/01/2024',
    signedAt: '20/01/2024',
  },
  {
    id: '2',
    reference: 'CONT-2024-006',
    title: 'Contrat location salle Château',
    client: 'Sophie & Alexandre',
    type: 'venue_contract',
    amount: 15000,
    status: 'sent',
    createdAt: '18/01/2024',
    signedAt: null,
  },
  {
    id: '3',
    reference: 'CONT-2024-007',
    title: 'Contrat prestations traiteur',
    client: 'Emma & Thomas',
    type: 'vendor_contract',
    amount: 12000,
    status: 'draft',
    createdAt: '22/01/2024',
    signedAt: null,
  },
];

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: Edit,
    color: 'bg-gray-100 text-gray-700',
  },
  sent: {
    label: 'Envoyé',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700',
  },
  signed: {
    label: 'Signé',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700',
  },
};

const typeLabels = {
  service_contract: 'Contrat de service',
  venue_contract: 'Contrat lieu',
  vendor_contract: 'Contrat prestataire',
};

export default function ContratsFinancePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Contrats
            </h1>
            <p className="text-brand-gray">
              Gestion des contrats commerciaux et juridiques
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-gray-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Brouillons</p>
            <p className="text-3xl font-bold text-brand-purple">
              {contratsDemo.filter(c => c.status === 'draft').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">En attente signature</p>
            <p className="text-3xl font-bold text-brand-purple">
              {contratsDemo.filter(c => c.status === 'sent').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Signés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {contratsDemo.filter(c => c.status === 'signed').length}
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un contrat..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contratsDemo.map((contrat) => {
            const status = statusConfig[contrat.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <Card key={contrat.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-brand-turquoise" />
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-label text-brand-gray mb-1">
                      {contrat.reference}
                    </p>
                    <h3 className="text-lg font-bold text-brand-purple mb-1">
                      {contrat.title}
                    </h3>
                    <p className="text-sm text-brand-gray">
                      {contrat.client}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Type:</span>
                      <span className="font-medium text-brand-purple">
                        {typeLabels[contrat.type as keyof typeof typeLabels]}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Montant:</span>
                      <span className="font-bold text-brand-purple">
                        {contrat.amount.toLocaleString()} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Créé le:</span>
                      <span className="text-brand-purple">
                        {contrat.createdAt}
                      </span>
                    </div>
                    {contrat.signedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-gray">Signé le:</span>
                        <span className="text-green-600 font-medium">
                          {contrat.signedAt}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                    >
                      <Eye className="h-3 w-3" />
                      Voir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
