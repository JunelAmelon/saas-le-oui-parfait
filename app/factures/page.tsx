import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Eye, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const facturesDemo = [
  {
    id: '1',
    reference: 'FACT-2024-001',
    client: 'Julie Martin & Frédérick Dubois',
    date: '25/01/2024',
    dueDate: '25/02/2024',
    montantHT: 25000,
    montantTTC: 30000,
    paid: 30000,
    status: 'paid',
    type: 'invoice',
  },
  {
    id: '2',
    reference: 'FACT-2024-002',
    client: 'Sophie Martin & Alexandre Petit',
    date: '20/01/2024',
    dueDate: '20/02/2024',
    montantHT: 15000,
    montantTTC: 18000,
    paid: 0,
    status: 'pending',
    type: 'invoice',
  },
  {
    id: '3',
    reference: 'ACOMPTE-2024-001',
    client: 'Emma Bernard & Thomas Moreau',
    date: '15/01/2024',
    dueDate: '15/02/2024',
    montantHT: 5000,
    montantTTC: 6000,
    paid: 6000,
    status: 'paid',
    type: 'deposit',
  },
  {
    id: '4',
    reference: 'FACT-2024-003',
    client: 'Marie Laurent',
    date: '10/01/2024',
    dueDate: '10/02/2024',
    montantHT: 32000,
    montantTTC: 38400,
    paid: 20000,
    status: 'partial',
    type: 'invoice',
  },
  {
    id: '5',
    reference: 'FACT-2024-004',
    client: 'Claire Dubois',
    date: '05/01/2024',
    dueDate: '05/02/2024',
    montantHT: 12000,
    montantTTC: 14400,
    paid: 0,
    status: 'overdue',
    type: 'invoice',
  },
];

const statusConfig = {
  paid: {
    label: 'Payée',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  pending: {
    label: 'En attente',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  partial: {
    label: 'Partiel',
    color: 'bg-orange-100 text-orange-700',
    icon: AlertCircle,
  },
  overdue: {
    label: 'En retard',
    color: 'bg-red-100 text-red-700',
    icon: AlertCircle,
  },
};

const typeLabels = {
  invoice: 'Facture',
  deposit: 'Acompte',
};

export default function FacturesPage() {
  const totalCA = facturesDemo.reduce((acc, f) => acc + f.paid, 0);
  const totalEnAttente = facturesDemo.filter(f => f.status !== 'paid').reduce((acc, f) => acc + (f.montantTTC - f.paid), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Factures
            </h1>
            <p className="text-brand-gray">
              Gérez vos factures et paiements clients
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Payées</p>
            <p className="text-3xl font-bold text-brand-purple">
              {facturesDemo.filter(f => f.status === 'paid').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">En attente</p>
            <p className="text-3xl font-bold text-brand-purple">
              {facturesDemo.filter(f => f.status === 'pending').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">CA encaissé</p>
            <p className="text-2xl font-bold text-brand-purple">
              {totalCA.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-orange-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">À encaisser</p>
            <p className="text-2xl font-bold text-brand-purple">
              {totalEnAttente.toLocaleString()} €
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher une facture..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>
        </Card>

        <div className="space-y-4">
          {facturesDemo.map((facture) => {
            const config = statusConfig[facture.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            const restant = facture.montantTTC - facture.paid;

            return (
              <Card key={facture.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-brand-turquoise" />
                      <h3 className="text-lg font-bold text-brand-purple">
                        {facture.reference}
                      </h3>
                      <Badge variant="outline" className="border-brand-turquoise text-brand-turquoise">
                        {typeLabels[facture.type as keyof typeof typeLabels]}
                      </Badge>
                    </div>
                    <p className="text-sm text-brand-gray mb-1">{facture.client}</p>
                    <p className="text-xs text-brand-gray">Émise le {facture.date} • Échéance: {facture.dueDate}</p>
                  </div>
                  <Badge className={config.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Montant TTC</p>
                    <p className="text-lg font-bold text-brand-purple">
                      {facture.montantTTC.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Payé</p>
                    <p className="text-lg font-bold text-green-600">
                      {facture.paid.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Restant</p>
                    <p className={`text-lg font-bold ${restant > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {restant.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">% Payé</p>
                    <p className="text-lg font-bold text-brand-purple">
                      {Math.round((facture.paid / facture.montantTTC) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
                    <Eye className="h-3 w-3" />
                    Voir
                  </Button>
                  <Button size="sm" variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2">
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  {facture.status !== 'paid' && (
                    <Button size="sm" variant="outline" className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white">
                      Enregistrer un paiement
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
