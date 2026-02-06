'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Eye, MessageSquare, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Heart, MapPin, Phone, Mail, Users, Euro } from 'lucide-react';
import Image from 'next/image';

interface EventCardProps {
  clientNames: string;
  date: string;
  reference: string;
  status: string;
  location?: string;
  guests?: number;
  budget?: number;
  spent?: number;
  imageUrl?: string;
}

const weddingImages = [
  'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=400',
];

export function EventCard({
  clientNames,
  date,
  reference,
  status,
  location = 'Château d\'Apigné, Rennes',
  guests = 120,
  budget = 35000,
  spent = 28000,
  imageUrl,
}: EventCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const router = useRouter();

  const clientData = {
    id: '1',
    names: clientNames,
    photo: imageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop',
    eventDate: date,
    eventLocation: location,
    budget: budget,
    guests: guests,
    phone: '+33 6 12 34 56 78',
    email: 'contact@example.com',
    status: status,
  };

  const handleGoToMessages = () => {
    setShowDetail(false);
    router.push('/messages');
  };

  const handleGoToDocuments = () => {
    setShowDetail(false);
    router.push(`/admin/clients/${clientData.id}/documents`);
  };

  const handleGoToPlanning = () => {
    setShowDetail(false);
    router.push(`/admin/clients/${clientData.id}/planning`);
  };

  const getImageUrl = () => {
    if (imageUrl) return imageUrl;
    const hash = reference.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return weddingImages[hash % weddingImages.length];
  };

  const event = {
    id: reference,
    couple: clientNames,
    date,
    location,
    guests,
    budget,
    spent,
    status,
    image: getImageUrl(),
  };

  return (
    <>
      <Card className="p-4 md:p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow cursor-pointer group">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className="relative h-24 w-full sm:w-24 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0"
            onClick={() => setShowDetail(true)}
          >
            <img
              src={getImageUrl()}
              alt={clientNames}
              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="mb-1 flex items-start justify-between">
              <h3
                className="text-lg font-bold text-brand-purple font-baskerville"
                onClick={() => setShowDetail(true)}
              >
                {clientNames}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="h-4 w-4 text-brand-gray" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleGoToMessages}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGoToDocuments}>
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGoToPlanning}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Planning
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-brand-gray mb-2">
              {date} | {reference}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#C4A26A] hover:bg-[#B59260] text-white border-0">
                {status}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="text-brand-turquoise hover:text-brand-turquoise-hover text-xs sm:text-sm"
                onClick={() => setShowDetail(true)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Voir détails
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              {clientData.names}
            </DialogTitle>
            <DialogDescription>
              Fiche client complète
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                {clientData.photo ? (
                  <Image
                    src={clientData.photo}
                    alt={clientData.names}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Heart className="h-8 w-8 text-brand-gray" />
                  </div>
                )}
              </div>
              <div>
                <Badge className="bg-brand-turquoise text-white mb-2">
                  {clientData.status}
                </Badge>
                <p className="text-2xl font-bold text-brand-purple">
                  {clientData.budget.toLocaleString()} € de budget
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-brand-turquoise" />
                <div>
                  <p className="text-xs text-brand-gray">Date</p>
                  <p className="font-medium text-brand-purple">{clientData.eventDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-brand-turquoise" />
                <div>
                  <p className="text-xs text-brand-gray">Lieu</p>
                  <p className="font-medium text-brand-purple">{clientData.eventLocation}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-brand-turquoise" />
                <div>
                  <p className="text-xs text-brand-gray">Invités</p>
                  <p className="font-medium text-brand-purple">{clientData.guests} personnes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Euro className="h-5 w-5 text-brand-turquoise" />
                <div>
                  <p className="text-xs text-brand-gray">Budget</p>
                  <p className="font-medium text-brand-purple">{clientData.budget.toLocaleString()} €</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-brand-purple">Contact</h4>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-brand-turquoise" />
                <span>{clientData.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-brand-turquoise" />
                <span>{clientData.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button variant="outline" className="gap-2" onClick={handleGoToMessages}>
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleGoToDocuments}>
                <FileText className="h-4 w-4" />
                Documents
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleGoToPlanning}>
                <CalendarIcon className="h-4 w-4" />
                Planning
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
