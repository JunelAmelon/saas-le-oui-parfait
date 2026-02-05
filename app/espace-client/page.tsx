'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import {
  Heart,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  FileText,
  Download,
  MessageSquare,
  Euro,
} from 'lucide-react';

const clientData = {
  names: 'Julie & Frédérick',
  eventDate: '23 août 2024',
  daysRemaining: 165,
  location: 'Château d\'Apigné, Rennes',
  guests: 120,
  budget: 25000,
  spent: 18500,
  progress: 74,
};

const timeline = [
  {
    id: '1',
    title: 'Lieu réservé',
    date: '15/01/2024',
    status: 'completed',
  },
  {
    id: '2',
    title: 'Traiteur confirmé',
    date: '22/01/2024',
    status: 'completed',
  },
  {
    id: '3',
    title: 'Photographe réservé',
    date: '05/02/2024',
    status: 'completed',
  },
  {
    id: '4',
    title: 'DJ confirmé',
    date: '12/02/2024',
    status: 'in_progress',
  },
  {
    id: '5',
    title: 'Fleuriste - rdv dégustation',
    date: '20/02/2024',
    status: 'pending',
  },
  {
    id: '6',
    title: 'Essayage robe',
    date: '01/03/2024',
    status: 'pending',
  },
];

const documents = [
  {
    id: '1',
    name: 'Contrat de prestation',
    type: 'Contrat',
    date: '20/01/2024',
    status: 'signed',
  },
  {
    id: '2',
    name: 'Devis traiteur',
    type: 'Devis',
    date: '22/01/2024',
    status: 'accepted',
  },
  {
    id: '3',
    name: 'Facture acompte - Château',
    type: 'Facture',
    date: '25/01/2024',
    status: 'paid',
  },
  {
    id: '4',
    name: 'Planning jour J',
    type: 'Planning',
    date: '01/02/2024',
    status: 'draft',
  },
];

const messages = [
  {
    id: '1',
    from: 'Caroline - Le Oui Parfait',
    message: 'J\'ai confirmé votre RDV avec le fleuriste pour le 20 février',
    date: '5 février',
    unread: true,
  },
  {
    id: '2',
    from: 'Caroline - Le Oui Parfait',
    message: 'Les photos du lieu sont disponibles dans vos documents',
    date: '3 février',
    unread: false,
  },
];

const payments = [
  {
    id: '1',
    description: 'Acompte Château d\'Apigné',
    amount: 5000,
    status: 'paid',
    date: '25/01/2024',
  },
  {
    id: '2',
    description: 'Acompte traiteur',
    amount: 3500,
    status: 'paid',
    date: '30/01/2024',
  },
  {
    id: '3',
    description: 'Solde photographe',
    amount: 2000,
    status: 'pending',
    dueDate: '15/02/2024',
  },
];

export default function ClientPortalPage() {
  return (
    <ClientDashboardLayout clientName={clientData.names} daysRemaining={clientData.daysRemaining}>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-brand-purple mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            Bienvenue {clientData.names}
          </h2>
          <p className="text-brand-gray">
            Suivez l'avancement des préparatifs de votre mariage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <Calendar className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Date du mariage</p>
            <p className="text-xl font-bold text-brand-purple">{clientData.eventDate}</p>
            <p className="text-xs text-brand-turquoise font-medium mt-1">
              J-{clientData.daysRemaining}
            </p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <MapPin className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Lieu</p>
            <p className="text-sm font-bold text-brand-purple">{clientData.location}</p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <Users className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Invités</p>
            <p className="text-2xl font-bold text-brand-purple">{clientData.guests}</p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <Euro className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Budget</p>
            <p className="text-xl font-bold text-brand-purple">
              {clientData.spent.toLocaleString()} €
            </p>
            <p className="text-xs text-brand-gray">sur {clientData.budget.toLocaleString()} €</p>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-brand-purple">
              Avancement global
            </h3>
            <Badge className="bg-brand-turquoise text-white text-lg px-4 py-1">
              {clientData.progress}%
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-turquoise transition-all duration-300"
              style={{ width: `${clientData.progress}%` }}
            />
          </div>
          <p className="text-sm text-brand-gray mt-2">
            Vos préparatifs avancent bien ! Continuez comme ça
          </p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-brand-turquoise" />
              Timeline des préparatifs
            </h3>
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.status === 'completed'
                          ? 'bg-green-100'
                          : item.status === 'in_progress'
                          ? 'bg-brand-turquoise/20'
                          : 'bg-gray-100'
                      }`}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : item.status === 'in_progress' ? (
                        <Clock className="h-5 w-5 text-brand-turquoise" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        item.status === 'completed'
                          ? 'text-brand-purple'
                          : 'text-brand-gray'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-sm text-brand-gray">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-brand-turquoise" />
              Messages récents
            </h3>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.unread ? 'bg-brand-turquoise/10 border-l-4 border-brand-turquoise' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-brand-purple text-sm">
                      {message.from}
                    </p>
                    <p className="text-xs text-brand-gray">{message.date}</p>
                  </div>
                  <p className="text-sm text-brand-gray">{message.message}</p>
                </div>
              ))}
              <Button className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
                <MessageSquare className="h-4 w-4" />
                Envoyer un message
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <FileText className="h-6 w-6 text-brand-turquoise" />
              Documents
            </h3>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-brand-turquoise" />
                    <div>
                      <p className="font-medium text-brand-purple text-sm">
                        {doc.name}
                      </p>
                      <p className="text-xs text-brand-gray">
                        {doc.type} - {doc.date}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-brand-turquoise hover:text-brand-turquoise-hover"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <Euro className="h-6 w-6 text-brand-turquoise" />
              Paiements
            </h3>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-brand-purple text-sm mb-1">
                      {payment.description}
                    </p>
                    <p className="text-xs text-brand-gray">
                      {payment.status === 'paid' ? `Payé le ${payment.date}` : `Échéance: ${payment.dueDate}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-purple">
                      {payment.amount.toLocaleString()} €
                    </p>
                    {payment.status === 'paid' ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        Payé
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        En attente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
              >
                Effectuer un paiement
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ClientDashboardLayout>
  );
}
