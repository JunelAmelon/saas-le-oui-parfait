'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Euro,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useState } from 'react';

interface Payment {
  id: string;
  description: string;
  vendor: string;
  amount: number;
  status: string;
  date?: string;
  dueDate?: string;
  method: string;
  invoice: boolean;
}

const budgetSummary = {
  total: 25000,
  paid: 18500,
  pending: 4500,
  remaining: 2000,
};

const payments = [
  {
    id: '1',
    description: 'Acompte Château d\'Apigné',
    vendor: 'Château d\'Apigné',
    amount: 5000,
    status: 'paid',
    date: '25/01/2024',
    method: 'Virement',
    invoice: true,
  },
  {
    id: '2',
    description: 'Acompte traiteur - 30%',
    vendor: 'Traiteur Le Gourmet',
    amount: 3500,
    status: 'paid',
    date: '30/01/2024',
    method: 'Carte bancaire',
    invoice: true,
  },
  {
    id: '3',
    description: 'Acompte photographe',
    vendor: 'Studio Photo Lumière',
    amount: 1500,
    status: 'paid',
    date: '05/02/2024',
    method: 'Virement',
    invoice: true,
  },
  {
    id: '4',
    description: 'Prestation Wedding Planner - Acompte',
    vendor: 'Le Oui Parfait',
    amount: 2500,
    status: 'paid',
    date: '20/01/2024',
    method: 'Virement',
    invoice: true,
  },
  {
    id: '5',
    description: 'Acompte DJ',
    vendor: 'DJ Ambiance',
    amount: 500,
    status: 'paid',
    date: '12/02/2024',
    method: 'Carte bancaire',
    invoice: true,
  },
  {
    id: '6',
    description: 'Acompte fleuriste - 50%',
    vendor: 'Atelier Floral',
    amount: 1500,
    status: 'pending',
    dueDate: '28/02/2024',
    method: '-',
    invoice: false,
  },
  {
    id: '7',
    description: 'Solde photographe',
    vendor: 'Studio Photo Lumière',
    amount: 2000,
    status: 'pending',
    dueDate: '15/08/2024',
    method: '-',
    invoice: false,
  },
  {
    id: '8',
    description: 'Solde traiteur - 70%',
    vendor: 'Traiteur Le Gourmet',
    amount: 8500,
    status: 'upcoming',
    dueDate: '23/08/2024',
    method: '-',
    invoice: false,
  },
];

const upcomingPayments = payments.filter(p => p.status === 'pending' || p.status === 'upcoming');

export default function PaiementsPage() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handlePayClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    setIsPaymentModalOpen(false);
    setIsSuccessModalOpen(true);
    setPaymentMethod('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">En attente</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700">À venir</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700">En retard</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'upcoming':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const progressPercentage = (budgetSummary.paid / budgetSummary.total) * 100;

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Paiements
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Suivez votre budget et vos paiements
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Effectuer un paiement</span>
            <span className="sm:hidden">Payer</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <div className="flex items-center gap-3 mb-2">
              <Euro className="h-6 w-6 text-brand-turquoise" />
              <p className="text-sm text-brand-gray">Budget total</p>
            </div>
            <p className="text-2xl font-bold text-brand-purple">
              {budgetSummary.total.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <p className="text-sm text-brand-gray">Déjà payé</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {budgetSummary.paid.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-6 w-6 text-orange-500" />
              <p className="text-sm text-brand-gray">En attente</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {budgetSummary.pending.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              <p className="text-sm text-brand-gray">Reste à payer</p>
            </div>
            <p className="text-2xl font-bold text-brand-purple">
              {budgetSummary.remaining.toLocaleString()} €
            </p>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-purple">Avancement du budget</h2>
            <span className="text-sm font-medium text-brand-turquoise">
              {progressPercentage.toFixed(0)}% payé
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-turquoise to-green-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-brand-gray">
            <span>0 €</span>
            <span>{budgetSummary.total.toLocaleString()} €</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6">
              Historique des paiements
            </h2>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {getStatusIcon(payment.status)}
                    <div>
                      <h3 className="font-medium text-brand-purple text-sm sm:text-base">{payment.description}</h3>
                      <p className="text-xs sm:text-sm text-brand-gray">{payment.vendor}</p>
                      <p className="text-xs text-brand-gray mt-1">
                        {payment.status === 'paid' 
                          ? `Payé le ${payment.date}`
                          : `Échéance: ${payment.dueDate}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-8 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base sm:text-lg font-bold text-brand-purple">
                        {payment.amount.toLocaleString()} €
                      </p>
                      {getStatusBadge(payment.status)}
                    </div>
                    {payment.invoice && (
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4 text-brand-turquoise" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Prochains paiements
            </h2>
            <div className="space-y-4">
              {upcomingPayments.map((payment) => (
                <div key={payment.id} className="p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-brand-purple">{payment.description}</p>
                      <p className="text-sm text-brand-gray">{payment.vendor}</p>
                    </div>
                    <p className="font-bold text-brand-purple">
                      {payment.amount.toLocaleString()} €
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-orange-600">
                      Échéance: {payment.dueDate}
                    </p>
                    <Button 
                      size="sm" 
                      className="bg-brand-turquoise hover:bg-brand-turquoise-hover text-xs"
                      onClick={() => handlePayClick(payment as Payment)}
                    >
                      Payer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Effectuer un paiement</DialogTitle>
              <DialogDescription>
                {selectedPayment 
                  ? `Paiement pour: ${selectedPayment.description}`
                  : 'Sélectionnez un mode de paiement'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedPayment && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-brand-purple">{selectedPayment.description}</p>
                  <p className="text-sm text-brand-gray">{selectedPayment.vendor}</p>
                  <p className="text-xl font-bold text-brand-turquoise mt-2">
                    {selectedPayment.amount.toLocaleString()} €
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un mode de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="transfer">Virement bancaire</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  <div>
                    <Label>Numéro de carte</Label>
                    <Input placeholder="1234 5678 9012 3456" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date d'expiration</Label>
                      <Input placeholder="MM/AA" className="mt-1" />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input placeholder="123" className="mt-1" />
                    </div>
                  </div>
                </div>
              )}
              {paymentMethod === 'transfer' && (
                <div className="p-4 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-700 mb-2">Coordonnées bancaires</p>
                  <p className="text-blue-600">IBAN: FR76 1234 5678 9012 3456 7890 123</p>
                  <p className="text-blue-600">BIC: BNPAFRPP</p>
                  <p className="text-blue-600 mt-2">Référence: MARIAGE-2024-{selectedPayment?.id}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={handleConfirmPayment}
                disabled={!paymentMethod}
              >
                Confirmer le paiement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="sm:max-w-md text-center">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-brand-purple text-xl">Paiement effectué !</DialogTitle>
              <DialogDescription className="mt-2">
                Votre paiement a été enregistré avec succès. Vous recevrez un email de confirmation.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => setIsSuccessModalOpen(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}
