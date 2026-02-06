'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Send, Clock, CheckCircle, Users, Eye, MousePointerClick, Calendar } from 'lucide-react';
import { useState } from 'react';
import { CampaignModal } from '@/components/modals/CampaignModal';

const campaignsDemo = [
  {
    id: '1',
    name: 'Newsletter Janvier 2024',
    subject: 'Les tendances mariage 2024',
    status: 'sent',
    recipientsCount: 156,
    openedCount: 98,
    clickedCount: 34,
    scheduledFor: null,
    sentAt: '15/01/2024 10:00',
    openRate: 62.8,
    clickRate: 21.8,
  },
  {
    id: '2',
    name: 'Relance prospects Février',
    subject: 'Votre mariage de rêve vous attend',
    status: 'scheduled',
    recipientsCount: 45,
    openedCount: 0,
    clickedCount: 0,
    scheduledFor: '10/02/2024 09:00',
    sentAt: null,
    openRate: 0,
    clickRate: 0,
  },
  {
    id: '3',
    name: 'Offre Saint-Valentin',
    subject: 'Offre spéciale pour vos préparatifs',
    status: 'sent',
    recipientsCount: 203,
    openedCount: 145,
    clickedCount: 67,
    scheduledFor: null,
    sentAt: '01/02/2024 08:00',
    openRate: 71.4,
    clickRate: 33.0,
  },
  {
    id: '4',
    name: 'Invitation portes ouvertes',
    subject: 'Venez découvrir nos services',
    status: 'draft',
    recipientsCount: 0,
    openedCount: 0,
    clickedCount: 0,
    scheduledFor: null,
    sentAt: null,
    openRate: 0,
    clickRate: 0,
  },
];

const statusConfig = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700',
    icon: Mail,
  },
  scheduled: {
    label: 'Programmée',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  sent: {
    label: 'Envoyée',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
};

export default function CampaignsPage() {
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Campagnes email
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Créez et suivez vos campagnes marketing
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsCampaignModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle campagne</span>
            <span className="sm:hidden">Nouvelle</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <div className="flex items-center justify-between mb-2">
              <Send className="h-8 w-8 text-brand-turquoise" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">
              {campaignsDemo.filter(c => c.status === 'sent').length}
            </p>
            <p className="text-sm text-brand-gray">Campagnes envoyées</p>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">
              {campaignsDemo.filter(c => c.status === 'sent').reduce((acc, c) => acc + c.recipientsCount, 0)}
            </p>
            <p className="text-sm text-brand-gray">Destinataires totaux</p>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Eye className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">
              {Math.round(
                campaignsDemo.filter(c => c.status === 'sent').reduce((acc, c) => acc + c.openRate, 0) /
                campaignsDemo.filter(c => c.status === 'sent').length
              )}%
            </p>
            <p className="text-sm text-brand-gray">Taux d'ouverture moyen</p>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <MousePointerClick className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">
              {Math.round(
                campaignsDemo.filter(c => c.status === 'sent').reduce((acc, c) => acc + c.clickRate, 0) /
                campaignsDemo.filter(c => c.status === 'sent').length
              )}%
            </p>
            <p className="text-sm text-brand-gray">Taux de clic moyen</p>
          </Card>
        </div>

        <div className="space-y-4">
          {campaignsDemo.map((campaign) => {
            const statusInfo = statusConfig[campaign.status as keyof typeof statusConfig];
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={campaign.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Mail className="h-5 w-5 text-brand-turquoise" />
                      <h3 className="text-lg font-bold text-brand-purple">
                        {campaign.name}
                      </h3>
                    </div>
                    <p className="text-sm text-brand-gray mb-1">
                      Objet: {campaign.subject}
                    </p>
                  </div>

                  <Badge className={statusInfo.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>

                {campaign.status === 'sent' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 rounded-lg bg-gray-50">
                    <div className="text-center">
                      <Users className="h-5 w-5 text-brand-turquoise mx-auto mb-1" />
                      <p className="text-2xl font-bold text-brand-purple">
                        {campaign.recipientsCount}
                      </p>
                      <p className="text-xs text-brand-gray">Destinataires</p>
                    </div>

                    <div className="text-center">
                      <Eye className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-brand-purple">
                        {campaign.openedCount}
                      </p>
                      <p className="text-xs text-brand-gray">
                        Ouvertures ({campaign.openRate.toFixed(1)}%)
                      </p>
                    </div>

                    <div className="text-center">
                      <MousePointerClick className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-brand-purple">
                        {campaign.clickedCount}
                      </p>
                      <p className="text-xs text-brand-gray">
                        Clics ({campaign.clickRate.toFixed(1)}%)
                      </p>
                    </div>

                    <div className="text-center">
                      <Calendar className="h-5 w-5 text-brand-turquoise mx-auto mb-1" />
                      <p className="text-sm font-bold text-brand-purple">
                        {campaign.sentAt}
                      </p>
                      <p className="text-xs text-brand-gray">Date d'envoi</p>
                    </div>
                  </div>
                )}

                {campaign.status === 'scheduled' && (
                  <div className="mb-4 p-4 rounded-lg bg-blue-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-brand-purple">
                          Programmée pour le {campaign.scheduledFor}
                        </p>
                        <p className="text-xs text-brand-gray">
                          {campaign.recipientsCount} destinataires
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                      onClick={() => alert('Fonctionnalité de modification de date à implémenter')}
                    >
                      Modifier la date
                    </Button>
                  </div>
                )}

                {campaign.status === 'draft' && (
                  <div className="mb-4 p-4 rounded-lg bg-gray-50">
                    <p className="text-sm text-brand-gray">
                      Campagne en cours de rédaction
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {campaign.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                        onClick={() => alert('Ouverture de l\'\u00e9diteur de campagne')}
                      >
                        Continuer l'édition
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
                      >
                        <Send className="h-3 w-3" />
                        Envoyer
                      </Button>
                    </>
                  )}
                  {campaign.status === 'scheduled' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white"
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                  {campaign.status === 'sent' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                        onClick={() => alert('Affichage des détails de la campagne')}
                      >
                        <Eye className="h-3 w-3" />
                        Voir les détails
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                        onClick={() => alert('Duplication de la campagne')}
                      >
                        Dupliquer
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
      />
    </DashboardLayout>
  );
}
