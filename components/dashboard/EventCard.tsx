'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventDetailModal } from '@/components/modals/EventDetailModal';

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
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 hidden sm:flex">
                <MoreVertical className="h-4 w-4 text-brand-gray" />
              </Button>
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

      <EventDetailModal open={showDetail} onOpenChange={setShowDetail} event={event} />
    </>
  );
}
