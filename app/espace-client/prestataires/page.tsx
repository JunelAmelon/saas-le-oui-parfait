'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  MessageSquare,
  CheckCircle,
  Clock,
  Calendar,
  Send,
} from 'lucide-react';
import { useState } from 'react';

interface Prestataire {
  id: string;
  name: string;
  category: string;
  avatar: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  website: string | null;
  status: string;
  rating: number;
  nextRdv: string | null;
}

const prestataires = [
  {
    id: '1',
    name: 'Château d\'Apigné',
    category: 'Lieu de réception',
    avatar: 'CA',
    contact: 'Marie Dupont',
    phone: '02 99 14 80 66',
    email: 'contact@chateau-apigne.fr',
    address: '35650 Le Rheu, Rennes',
    website: 'www.chateau-apigne.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: '10/04/2024 - Visite finale',
  },
  {
    id: '2',
    name: 'Traiteur Le Gourmet',
    category: 'Traiteur',
    avatar: 'TG',
    contact: 'Pierre Martin',
    phone: '02 99 45 23 12',
    email: 'contact@legourmet.fr',
    address: 'Rennes',
    website: 'www.traiteur-legourmet.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: '15/03/2024 - Dégustation menu',
  },
  {
    id: '3',
    name: 'Studio Photo Lumière',
    category: 'Photographe',
    avatar: 'SP',
    contact: 'Sophie Bernard',
    phone: '06 12 34 56 78',
    email: 'sophie@studiolumiere.fr',
    address: 'Rennes',
    website: 'www.studio-lumiere.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: null,
  },
  {
    id: '4',
    name: 'DJ Ambiance',
    category: 'DJ / Animation',
    avatar: 'DJ',
    contact: 'Thomas Leroy',
    phone: '06 98 76 54 32',
    email: 'thomas@dj-ambiance.fr',
    address: 'Rennes',
    website: null,
    status: 'pending',
    rating: 4,
    nextRdv: '12/02/2024 - Validation playlist',
  },
  {
    id: '5',
    name: 'Atelier Floral',
    category: 'Fleuriste',
    avatar: 'AF',
    contact: 'Claire Moreau',
    phone: '02 99 67 89 10',
    email: 'contact@atelierfloral.fr',
    address: 'Rennes',
    website: 'www.atelier-floral.fr',
    status: 'pending',
    rating: 5,
    nextRdv: '20/02/2024 - Choix des compositions',
  },
  {
    id: '6',
    name: 'Le Oui Parfait',
    category: 'Wedding Planner',
    avatar: 'LP',
    contact: 'Caroline Duval',
    phone: '06 11 22 33 44',
    email: 'caroline@leouiparfait.fr',
    address: 'Rennes',
    website: 'www.leouiparfait.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: 'Disponible sur demande',
  },
];

export default function PrestatairesPage() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [message, setMessage] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleContact = (presta: Prestataire) => {
    setSelectedPrestataire(presta);
    setIsContactModalOpen(true);
  };

  const handleSendMessage = () => {
    setIsContactModalOpen(false);
    setIsSuccessModalOpen(true);
    setMessage('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700">Confirmé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">En attente</Badge>;
      default:
        return null;
    }
  };

  const confirmedCount = prestataires.filter(p => p.status === 'confirmed').length;
  const pendingCount = prestataires.filter(p => p.status === 'pending').length;

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple flex items-center gap-3">
              <Users className="h-8 w-8 text-brand-turquoise" />
              Mes Prestataires
            </h1>
            <p className="text-brand-gray mt-1">
              Tous vos prestataires pour le jour J
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-brand-turquoise" />
              <div>
                <p className="text-2xl font-bold text-brand-purple">{prestataires.length}</p>
                <p className="text-sm text-brand-gray">Prestataires total</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                <p className="text-sm text-brand-gray">Confirmés</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                <p className="text-sm text-brand-gray">En attente</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {prestataires.map((presta) => (
            <Card key={presta.id} className="p-6 shadow-xl border-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-brand-turquoise text-white text-lg">
                      {presta.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-brand-purple text-lg">{presta.name}</h3>
                    <p className="text-sm text-brand-gray">{presta.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < presta.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {getStatusBadge(presta.status)}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-brand-purple">{presta.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-brand-purple">{presta.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-brand-gray">{presta.address}</span>
                </div>
                {presta.nextRdv && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-brand-turquoise" />
                    <span className="text-brand-purple font-medium">{presta.nextRdv}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleContact(presta as Prestataire)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Contacter
                </Button>
                {presta.website && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-brand-turquoise"
                    onClick={() => window.open(`https://${presta.website}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Site web
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Contacter {selectedPrestataire?.name}</DialogTitle>
              <DialogDescription>
                Envoyez un message à {selectedPrestataire?.contact}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedPrestataire && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-brand-turquoise text-white">
                      {selectedPrestataire.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-brand-purple">{selectedPrestataire.name}</p>
                    <p className="text-xs text-brand-gray">{selectedPrestataire.email}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Votre message</Label>
                <Textarea 
                  placeholder="Écrivez votre message ici..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
                Envoyer
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
              <DialogTitle className="text-brand-purple text-xl">Message envoyé !</DialogTitle>
              <DialogDescription className="mt-2">
                Votre message a été envoyé à {selectedPrestataire?.name}. Vous recevrez une réponse prochainement.
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
    </ClientDashboardLayout>
  );
}
