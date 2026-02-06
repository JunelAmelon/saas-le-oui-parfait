'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, Download, Eye, Edit, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ContractModal } from '@/components/modals/ContractModal';

const contractsDemo = [
  {
    id: '1',
    reference: 'CONT-2024-001',
    title: 'Contrat de prestation Wedding Planning',
    client: 'Julie & Frédérick',
    type: 'service_contract',
    amount: 5000,
    status: 'signed',
    createdAt: '15/01/2024',
    signedAt: '20/01/2024',
  },
  {
    id: '2',
    reference: 'CONT-2024-002',
    title: 'Contrat Château d\'Apigné',
    client: 'Julie & Frédérick',
    type: 'venue_contract',
    amount: 12000,
    status: 'sent',
    createdAt: '18/01/2024',
    signedAt: null,
  },
  {
    id: '3',
    reference: 'CONT-2024-003',
    title: 'Contrat de prestation Wedding Planning',
    client: 'Sophie & Alexandre',
    type: 'service_contract',
    amount: 6500,
    status: 'signed',
    createdAt: '22/01/2024',
    signedAt: '25/01/2024',
  },
  {
    id: '4',
    reference: 'CONT-2024-004',
    title: 'Contrat traiteur - Le Gourmet',
    client: 'Sophie & Alexandre',
    type: 'vendor_contract',
    amount: 15000,
    status: 'draft',
    createdAt: '01/02/2024',
    signedAt: null,
  },
  {
    id: '5',
    reference: 'CONT-2024-005',
    title: 'Contrat de prestation Wedding Planning',
    client: 'Emma & Thomas',
    type: 'service_contract',
    amount: 5500,
    status: 'signed',
    createdAt: '05/02/2024',
    signedAt: '08/02/2024',
  },
];

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: Edit,
    color: 'bg-gray-100 text-gray-700',
    iconColor: 'text-gray-500',
  },
  sent: {
    label: 'Envoyé',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-500',
  },
  signed: {
    label: 'Signé',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700',
    iconColor: 'text-green-500',
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
    iconColor: 'text-red-500',
  },
};

const typeLabels = {
  service_contract: 'Contrat de service',
  venue_contract: 'Contrat lieu',
  vendor_contract: 'Contrat prestataire',
};

export default function ContractsPage() {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Contrats
            </h1>
            <p className="text-brand-gray">
              Gérez tous vos contrats clients et prestataires
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => setIsContractModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
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
          {contractsDemo.map((contract) => {
            const status = statusConfig[contract.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <Card key={contract.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
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
                      {contract.reference}
                    </p>
                    <h3 className="text-lg font-bold text-brand-purple mb-1">
                      {contract.title}
                    </h3>
                    <p className="text-sm text-brand-gray">
                      {contract.client}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Type:</span>
                      <span className="font-medium text-brand-purple">
                        {typeLabels[contract.type as keyof typeof typeLabels]}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Montant:</span>
                      <span className="font-bold text-brand-purple">
                        {contract.amount.toLocaleString()} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Créé le:</span>
                      <span className="text-brand-purple">
                        {contract.createdAt}
                      </span>
                    </div>
                    {contract.signedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-gray">Signé le:</span>
                        <span className="text-green-600 font-medium">
                          {contract.signedAt}
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

      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
      />
    </DashboardLayout>
  );
}
