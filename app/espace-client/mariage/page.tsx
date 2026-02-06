'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  Calendar,
  MapPin,
  Users,
  Clock,
  Palette,
  Music,
  Utensils,
  Camera,
  Edit,
  Save,
} from 'lucide-react';
import { useState } from 'react';
import { ColorPalette } from '@/components/wedding/ColorPalette';

const weddingData = {
  couple: {
    partner1: 'Julie Martin',
    partner2: 'Frédérick Dubois',
  },
  date: '23 août 2024',
  time: '15:00',
  daysRemaining: 165,
  venue: {
    name: 'Château d\'Apigné',
    address: '35650 Le Rheu, Rennes',
    capacity: 200,
  },
  guests: {
    invited: 150,
    confirmed: 120,
    pending: 25,
    declined: 5,
  },
  theme: {
    style: 'Champêtre chic',
    colors: ['#E8D5B7', '#7BA89D', '#C4A26A', '#FFFFFF'],
    description: 'Un mariage élégant aux tons naturels, mêlant la douceur du champêtre à la sophistication.',
  },
  notes: 'Cérémonie laïque dans le parc du château, cocktail sur la terrasse, dîner dans la grande salle.',
};

export default function MariagePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [weddingInfo, setWeddingInfo] = useState(weddingData);
  
  const handleColorChange = (colors: string[]) => {
    setWeddingInfo({
      ...weddingInfo,
      theme: {
        ...weddingInfo.theme,
        colors,
      },
    });
  };

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={weddingData.daysRemaining}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 fill-red-500" />
              Mon Mariage
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Toutes les informations sur votre grand jour
            </p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            className={`w-full sm:w-auto ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-turquoise hover:bg-brand-turquoise-hover'}`}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 lg:col-span-2">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <Heart className="h-5 w-5 text-brand-turquoise" />
              Les Mariés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-brand-gray">Partenaire 1</Label>
                {isEditing ? (
                  <Input 
                    value={weddingInfo.couple.partner1} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      couple: { ...weddingInfo.couple, partner1: e.target.value }
                    })}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-lg font-medium text-brand-purple mt-1">
                    {weddingInfo.couple.partner1}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-brand-gray">Partenaire 2</Label>
                {isEditing ? (
                  <Input 
                    value={weddingInfo.couple.partner2} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      couple: { ...weddingInfo.couple, partner2: e.target.value }
                    })}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-lg font-medium text-brand-purple mt-1">
                    {weddingInfo.couple.partner2}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <h2 className="text-xl font-bold text-brand-purple mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-turquoise" />
              Compte à rebours
            </h2>
            <div className="text-center">
              <p className="text-5xl font-bold text-brand-turquoise">
                J-{weddingInfo.daysRemaining}
              </p>
              {isEditing ? (
                <>
                  <Input 
                    value={weddingInfo.date} 
                    onChange={(e) => setWeddingInfo({ ...weddingInfo, date: e.target.value })}
                    className="mt-2 text-center" 
                  />
                  <Input 
                    value={weddingInfo.time} 
                    onChange={(e) => setWeddingInfo({ ...weddingInfo, time: e.target.value })}
                    className="mt-1 text-center text-sm" 
                  />
                </>
              ) : (
                <>
                  <p className="text-brand-gray mt-2">{weddingInfo.date}</p>
                  <p className="text-sm text-brand-gray">à {weddingInfo.time}</p>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-turquoise" />
              Lieu de réception
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-brand-gray">Nom du lieu</Label>
                {isEditing ? (
                  <Input 
                    value={weddingInfo.venue.name} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      venue: { ...weddingInfo.venue, name: e.target.value }
                    })}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-lg font-medium text-brand-purple mt-1">
                    {weddingInfo.venue.name}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-brand-gray">Adresse</Label>
                {isEditing ? (
                  <Input 
                    value={weddingInfo.venue.address} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      venue: { ...weddingInfo.venue, address: e.target.value }
                    })}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-brand-purple mt-1">{weddingInfo.venue.address}</p>
                )}
              </div>
              <div>
                <Label className="text-brand-gray">Capacité</Label>
                {isEditing ? (
                  <Input 
                    type="number"
                    value={weddingInfo.venue.capacity} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      venue: { ...weddingInfo.venue, capacity: parseInt(e.target.value) }
                    })}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-brand-purple mt-1">{weddingInfo.venue.capacity} personnes</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-turquoise" />
              Invités
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                {isEditing ? (
                  <Input 
                    type="number"
                    value={weddingInfo.guests.invited} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      guests: { ...weddingInfo.guests, invited: parseInt(e.target.value) }
                    })}
                    className="text-center font-bold" 
                  />
                ) : (
                  <p className="text-3xl font-bold text-brand-purple">{weddingInfo.guests.invited}</p>
                )}
                <p className="text-sm text-brand-gray mt-1">Invités</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                {isEditing ? (
                  <Input 
                    type="number"
                    value={weddingInfo.guests.confirmed} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      guests: { ...weddingInfo.guests, confirmed: parseInt(e.target.value) }
                    })}
                    className="text-center font-bold" 
                  />
                ) : (
                  <p className="text-3xl font-bold text-green-600">{weddingInfo.guests.confirmed}</p>
                )}
                <p className="text-sm text-brand-gray mt-1">Confirmés</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                {isEditing ? (
                  <Input 
                    type="number"
                    value={weddingInfo.guests.pending} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      guests: { ...weddingInfo.guests, pending: parseInt(e.target.value) }
                    })}
                    className="text-center font-bold" 
                  />
                ) : (
                  <p className="text-3xl font-bold text-orange-600">{weddingInfo.guests.pending}</p>
                )}
                <p className="text-sm text-brand-gray mt-1">En attente</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                {isEditing ? (
                  <Input 
                    type="number"
                    value={weddingInfo.guests.declined} 
                    onChange={(e) => setWeddingInfo({
                      ...weddingInfo,
                      guests: { ...weddingInfo.guests, declined: parseInt(e.target.value) }
                    })}
                    className="text-center font-bold" 
                  />
                ) : (
                  <p className="text-3xl font-bold text-red-600">{weddingInfo.guests.declined}</p>
                )}
                <p className="text-sm text-brand-gray mt-1">Déclinés</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
            <Palette className="h-5 w-5 text-brand-turquoise" />
            Thème & Décoration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-brand-gray">Style</Label>
              {isEditing ? (
                <Input 
                  value={weddingInfo.theme.style} 
                  onChange={(e) => setWeddingInfo({
                    ...weddingInfo,
                    theme: { ...weddingInfo.theme, style: e.target.value }
                  })}
                  className="mt-1" 
                />
              ) : (
                <p className="text-lg font-medium text-brand-purple mt-1">
                  {weddingInfo.theme.style}
                </p>
              )}
              <div className="mt-4">
                <Label className="text-brand-gray">Palette de couleurs</Label>
                <div className="mt-2">
                  <ColorPalette 
                    selectedColors={weddingInfo.theme.colors}
                    onColorsChange={handleColorChange}
                    maxColors={6}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-brand-gray">Description</Label>
              {isEditing ? (
                <Textarea 
                  value={weddingInfo.theme.description} 
                  onChange={(e) => setWeddingInfo({
                    ...weddingInfo,
                    theme: { ...weddingInfo.theme, description: e.target.value }
                  })}
                  className="mt-1" 
                  rows={4} 
                />
              ) : (
                <p className="text-brand-purple mt-1">{weddingInfo.theme.description}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-xl border-0">
          <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-turquoise" />
            Notes & Déroulement
          </h2>
          {isEditing ? (
            <Textarea 
              value={weddingInfo.notes} 
              onChange={(e) => setWeddingInfo({ ...weddingInfo, notes: e.target.value })}
              className="mt-1" 
              rows={4} 
            />
          ) : (
            <p className="text-brand-purple">{weddingInfo.notes}</p>
          )}
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
