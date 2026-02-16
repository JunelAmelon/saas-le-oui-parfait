'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, FileText, CheckCircle2, Calendar, CheckCircle, X } from 'lucide-react';
import type { AppNotification, NotificationType } from '@/hooks/use-notifications';
import { useRouter } from 'next/navigation';

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
      return { icon: MessageSquare, color: 'text-purple-500', bgColor: 'bg-purple-50' };
    case 'document':
      return { icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-50' };
    case 'change_request':
      return { icon: CheckCircle2, color: 'text-blue-500', bgColor: 'bg-blue-50' };
    case 'planning':
      return { icon: Calendar, color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'step':
      return { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-50' };
    default:
      return { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-50' };
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    isUnread ? 'border-brand-turquoise bg-brand-turquoise/5' : 'border-gray-200 bg-white'
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
                    <div className={`p-2 rounded-lg ${style.bgColor} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${style.color}`} />
                    </div>
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
                      <p className="text-xs text-brand-gray">{formatTime(notification.created_at)}</p>
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
            className="w-full border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
          >
            Voir toutes les notifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
