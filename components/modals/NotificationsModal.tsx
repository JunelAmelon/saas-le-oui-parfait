'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Users, MessageSquare, FileText, CheckCircle2, X } from 'lucide-react';

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const notifications = [
  {
    id: '1',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    title: 'Nouveau rendez-vous',
    message: 'Entretien avec Julie & Frédérick demain à 14h',
    time: 'Il y a 10 min',
    unread: true,
  },
  {
    id: '2',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    title: 'Nouveau prospect',
    message: 'Emma Bernard a rempli le formulaire de contact',
    time: 'Il y a 1h',
    unread: true,
  },
  {
    id: '3',
    icon: MessageSquare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    title: 'Nouveau message',
    message: "Château d'Apigné a envoyé un message",
    time: 'Il y a 2h',
    unread: true,
  },
  {
    id: '4',
    icon: FileText,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    title: 'Devis validé',
    message: 'Sophie Martin a accepté le devis DEVIS-2024-002',
    time: 'Il y a 3h',
    unread: false,
  },
  {
    id: '5',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    title: 'Paiement reçu',
    message: "Acompte de 6000€ reçu pour l'événement EM-TH-2024",
    time: 'Hier',
    unread: false,
  },
];

export function NotificationsModal({ open, onOpenChange }: NotificationsModalProps) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-brand-purple flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white ml-2">
                  {unreadCount}
                </Badge>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div className="flex gap-2">
            <Button size="sm" className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
              Toutes
            </Button>
            <Button size="sm" variant="outline">
              Non lues ({unreadCount})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-brand-turquoise hover:text-brand-turquoise-hover"
            >
              Tout marquer comme lu
            </Button>
          </div>

          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.unread
                      ? 'border-brand-turquoise bg-brand-turquoise/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${notification.bgColor} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${notification.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-brand-purple text-sm">
                          {notification.title}
                        </h4>
                        {notification.unread && (
                          <div className="h-2 w-2 rounded-full bg-brand-turquoise flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      <p className="text-sm text-brand-gray mb-2">{notification.message}</p>
                      <p className="text-xs text-brand-gray">{notification.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="w-full border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
          >
            Voir toutes les notifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
