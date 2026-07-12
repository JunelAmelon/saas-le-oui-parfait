'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, FileText, CheckCircle2, Calendar, CheckCircle, X, CreditCard } from 'lucide-react';
import type { AppNotification, NotificationType } from '@/hooks/use-notifications';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllAsRead: () => Promise<void>;
  onMarkAsRead: (notificationId: string) => Promise<void>;
}

const getNotifStyle = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return { icon: MessageSquare, color: 'text-purple-500', bgColor: 'bg-purple-50', kathy: true };
    case 'document':
      return { icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-50', kathy: false };
    case 'change_request':
      return { icon: CheckCircle2, color: 'text-blue-500', bgColor: 'bg-blue-50', kathy: false };
    case 'planning':
      return { icon: Calendar, color: 'text-green-600', bgColor: 'bg-green-50', kathy: false };
    case 'step':
      return { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', kathy: false };
    case 'payment':
      return { icon: CreditCard, color: 'text-emerald-600', bgColor: 'bg-emerald-50', kathy: false };
    default:
      return { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-50', kathy: false };
  }
};

const formatTime = (createdAt: any) => {
  const d: Date | null = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR');
};

export function NotificationsModal({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onMarkAsRead,
}: NotificationsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = Boolean(pathname?.startsWith('/espace-client'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="relative bg-brand-beige/40 px-6 pt-10 pb-6">
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full border-brand-purple/15 text-brand-purple hover:bg-brand-purple/8 hover:text-brand-purple bg-white/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-white shadow-[0_8px_24px_-8px_rgba(75,68,86,0.25)] mb-4 bg-brand-purple">
              <Image
                src="/kathy.png"
                alt="Kathy"
                fill
                className="object-cover object-top scale-110"
                sizes="(max-width: 640px) 80px, 96px"
              />
            </div>
            <DialogTitle className="text-2xl font-bold text-brand-purple flex items-center gap-2">
              <Bell className="h-6 w-6 text-brand-turquoise" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white ml-2">
                  {unreadCount}
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-brand-gray mt-1 max-w-sm">
              Votre wedding planner Kathy vous tient informé(e) de l'avancement de votre mariage.
            </p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="bg-brand-purple hover:bg-brand-purple/90 text-white">
              Toutes
            </Button>
            <Button size="sm" variant="outline" className="border-brand-purple/15 text-brand-purple">
              Non lues ({unreadCount})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-brand-purple hover:text-brand-purple hover:bg-brand-purple/8"
              onClick={() => void onMarkAllAsRead()}
            >
              Tout marquer comme lu
            </Button>
          </div>

          <div className="space-y-2">
            {notifications.map((notification) => {
              const style = getNotifStyle(notification.type);
              const Icon = style.icon;
              const isUnread = !notification.read;
              return (
                <button
                  key={notification.id}
                  type="button"
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isUnread ? 'border-brand-turquoise bg-brand-turquoise/5' : 'border-brand-purple/8 bg-white'
                  }`}
                  onClick={async () => {
                    try {
                      if (isUnread) await onMarkAsRead(notification.id);
                    } finally {
                      if (notification.link) {
                        onOpenChange(false);
                        router.push(notification.link);
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {style.kathy ? (
                      <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white shadow-sm flex-shrink-0 bg-brand-purple">
                        <Image
                          src="/kathy.png"
                          alt="Kathy"
                          width={36}
                          height={36}
                          className="object-cover object-top scale-110"
                        />
                      </div>
                    ) : (
                      <div className={`p-2 rounded-lg ${style.bgColor} flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${style.color}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-brand-purple text-sm">
                          {notification.title}
                        </h4>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-brand-turquoise flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      <p className="text-sm text-brand-gray mb-2">{notification.message}</p>
                      <p className="text-xs text-brand-gray/70">{formatTime(notification.created_at)}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {notifications.length === 0 ? (
              <div className="p-6 text-sm text-brand-gray text-center">Aucune notification.</div>
            ) : null}
          </div>

          <Button
            variant="outline"
            className="w-full border-brand-purple/15 text-brand-purple hover:bg-brand-purple hover:text-white"
            onClick={() => {
              onOpenChange(false);
              router.push(isClient ? '/espace-client/notifications' : '/notifications');
            }}
          >
            Voir toutes les notifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
