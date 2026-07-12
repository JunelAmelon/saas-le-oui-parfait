'use client';

import { Card } from '@/components/ui/card';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Settings,
  User,
  Mail,
  Phone,
  Camera,
} from 'lucide-react';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';

export default function ParametresPage() {
  const { client, event } = useClientData();

  const clientName = `${client?.name || ''}${client?.partner ? ' & ' + client.partner : ''}`.trim() || event?.couple_names || 'Client';
  const daysRemaining = event?.event_date ? calculateDaysRemaining(event.event_date) : 0;
  const weddingDateLabel = event?.event_date ? new Date(event.event_date).toLocaleDateString('fr-FR') : '';

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center justify-center gap-2 sm:gap-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Paramètres
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Vos informations personnelles
          </p>
        </div>

        <Card className="p-6 sm:p-8 shadow-xl border-0 bg-gradient-to-br from-white to-brand-beige/40">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar className="h-28 w-28 ring-4 ring-white shadow-[0_8px_24px_-8px_rgba(75,68,86,0.25)]">
                {client?.photo ? <AvatarImage src={client.photo} alt={clientName} className="object-cover" /> : null}
                <AvatarFallback className="bg-brand-turquoise text-white text-3xl">
                  {(clientName || 'CL')
                    .split(' ')
                    .filter(Boolean)
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-1 right-1 p-2 bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full text-white shadow-md transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h2 className="font-baskerville text-xl text-brand-purple">{clientName}</h2>
            <p className="text-sm text-brand-gray mt-1">
              {weddingDateLabel ? `Mariage le ${weddingDateLabel}` : ''}
            </p>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 shadow-xl border-0">
          <h2 className="text-xl font-bold text-brand-purple mb-5 flex items-center gap-2">
            <User className="h-5 w-5 text-brand-turquoise" />
            Informations personnelles
          </h2>

          <p className="text-sm text-brand-gray mb-5">
            Ces informations sont gérées par votre wedding planner. Pour les modifier, contactez-la directement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="partner1" className="text-brand-purple">Partenaire 1</Label>
              <Input id="partner1" defaultValue={client?.name || ''} disabled className="mt-1.5 bg-brand-beige/40 text-brand-purple/80 border-0 cursor-not-allowed" />
            </div>
            <div>
              <Label htmlFor="partner2" className="text-brand-purple">Partenaire 2</Label>
              <Input id="partner2" defaultValue={client?.partner || ''} disabled className="mt-1.5 bg-brand-beige/40 text-brand-purple/80 border-0 cursor-not-allowed" />
            </div>
            <div>
              <Label htmlFor="email" className="text-brand-purple">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray/60" />
                <Input id="email" type="email" defaultValue={client?.email || ''} disabled className="pl-10 bg-brand-beige/40 text-brand-purple/80 border-0 cursor-not-allowed" />
              </div>
            </div>
            <div>
              <Label htmlFor="phone" className="text-brand-purple">Téléphone</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray/60" />
                <Input id="phone" type="tel" defaultValue="06 12 34 56 78" disabled className="pl-10 bg-brand-beige/40 text-brand-purple/80 border-0 cursor-not-allowed" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
