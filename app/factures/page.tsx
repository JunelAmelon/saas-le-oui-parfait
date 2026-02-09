'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Eye, Download, Clock, CheckCircle, AlertCircle, DollarSign, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NewInvoiceModal } from '@/components/modals/NewInvoiceModal';
import { RecordPaymentModal } from '@/components/modals/RecordPaymentModal';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { toast } from 'sonner';

interface Facture {
  id: string;
  reference: string;
  client: string;
  date: string;
  dueDate: string;
  montantHT: number;
  montantTTC: number;
  paid: number;
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  type: 'invoice' | 'deposit';
  pdfUrl?: string;
}

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
  const { user } = useAuth();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const fetchFactures = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('invoices', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((f: any) => ({
        id: f.id,
        reference: f.reference,
        client: f.client,
        date: f.date,
        dueDate: f.due_date,
        montantHT: f.montant_ht || 0,
        montantTTC: f.montant_ttc || 0,
        paid: f.paid || 0,
        status: f.status,
        type: f.type,
        pdfUrl: f.pdf_url || '',
      }));
      setFactures(mapped);
    } catch (e) {
      console.error('Error fetching invoices:', e);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactures();
  }, [user]);
  
  const totalCA = factures.reduce((acc, f) => acc + f.paid, 0);
  const totalEnAttente = factures.filter(f => f.status !== 'paid').reduce((acc, f) => acc + (f.montantTTC - f.paid), 0);

  const filteredFactures = factures.filter(f =>
    f.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewInvoice = (facture: Facture) => {
    if (facture.pdfUrl) {
      window.open(facture.pdfUrl, '_blank');
    } else {
      toast.error('Aucun PDF disponible');
    }
  };

  const handleDownloadInvoice = (facture: Facture) => {
    if (facture.pdfUrl) {
      const link = document.createElement('a');
      link.href = facture.pdfUrl;
      link.download = `${facture.reference}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Téléchargement lancé');
    } else {
      toast.error('Aucun PDF disponible');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Factures
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez vos factures et paiements clients
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 flex-1 sm:flex-none"
              onClick={() => setIsNewInvoiceOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle facture</span>
              <span className="sm:hidden">Nouvelle</span>
            </Button>
            <Button 
              variant="outline"
              className="gap-2 flex-1 sm:flex-none border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white"
              onClick={() => setIsRecordPaymentOpen(true)}
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Enregistrer un paiement</span>
              <span className="sm:hidden">Paiement</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Payées</p>
            <p className="text-3xl font-bold text-brand-purple">
              {factures.filter(f => f.status === 'paid').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">En attente</p>
            <p className="text-3xl font-bold text-brand-purple">
              {factures.filter(f => f.status === 'pending').length}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : filteredFactures.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucune facture'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Créez votre première facture'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsNewInvoiceOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                <Plus className="h-4 w-4 mr-2" /> Créer une facture
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFactures.map((facture) => {
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
                  <Button size="sm" className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2" onClick={() => handleViewInvoice(facture)}>
                    <Eye className="h-3 w-3" />
                    Voir
                  </Button>
                  <Button size="sm" variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2" onClick={() => handleDownloadInvoice(facture)}>
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  {facture.status !== 'paid' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                      onClick={() => setIsRecordPaymentOpen(true)}
                    >
                      Enregistrer un paiement
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
          </div>
        )}
      </div>

      <NewInvoiceModal isOpen={isNewInvoiceOpen} onClose={() => { setIsNewInvoiceOpen(false); fetchFactures(); }} />
      <RecordPaymentModal isOpen={isRecordPaymentOpen} onClose={() => { setIsRecordPaymentOpen(false); fetchFactures(); }} />
    </DashboardLayout>
  );
}
