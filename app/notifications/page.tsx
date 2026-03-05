'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell, Trash2 } from 'lucide-react';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, unreadCount, loading, markAllAsRead, markAsRead, deleteOne, deleteRead, deleteAll } = useNotifications(user?.uid, 300);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const stats = useMemo(() => {
    const total = items.length;
    const unread = unreadCount;
    const read = Math.max(0, total - unread);
    return { total, unread, read };
  }, [items.length, unreadCount]);

  const visibleItems = useMemo(() => {
    return unreadOnly ? items.filter((n) => !n.read) : items;
  }, [items, unreadOnly]);

  const formatTime = (createdAt: any) => {
    const d: Date | null = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR');
  };

  const deleteReadConfirm = async () => {
    const count = items.filter((n) => n.read).length;
    if (count === 0) return;
    if (!confirm(`Supprimer définitivement ${count} notification(s) lue(s) ?`)) return;
    await deleteRead();
  };

  const deleteAllConfirm = async () => {
    if (items.length === 0) return;
    if (!confirm(`Supprimer définitivement toutes les notifications (${items.length}) ?`)) return;
    await deleteAll();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-gray">Chargement...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2 flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">Toutes tes notifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 shadow-xl border-0">
            <p className="text-sm text-brand-gray">Total</p>
            <p className="text-2xl font-bold text-brand-purple">{stats.total}</p>
          </Card>
          <Card className="p-4 shadow-xl border-0">
            <p className="text-sm text-brand-gray">Non lues</p>
            <p className="text-2xl font-bold text-brand-purple">{stats.unread}</p>
          </Card>
          <Card className="p-4 shadow-xl border-0">
            <p className="text-sm text-brand-gray">Lues</p>
            <p className="text-2xl font-bold text-brand-purple">{stats.read}</p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                className={!unreadOnly ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : ''}
                variant={!unreadOnly ? 'default' : 'outline'}
                onClick={() => setUnreadOnly(false)}
              >
                Toutes
              </Button>
              <Button
                size="sm"
                className={unreadOnly ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : ''}
                variant={unreadOnly ? 'default' : 'outline'}
                onClick={() => setUnreadOnly(true)}
              >
                Non lues ({stats.unread})
              </Button>
            </div>

            <div className="flex gap-2 md:ml-auto">
              <Button size="sm" variant="ghost" className="text-brand-turquoise" onClick={() => void markAllAsRead()}>
                Tout marquer comme lu
              </Button>
              <Button size="sm" variant="outline" onClick={() => void deleteReadConfirm()}>
                Supprimer lues
              </Button>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => void deleteAllConfirm()}>
                Tout supprimer
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-xl border-0">
          {loading ? (
            <div className="p-6 text-sm text-brand-gray text-center">Chargement...</div>
          ) : visibleItems.length === 0 ? (
            <div className="p-6 text-sm text-brand-gray text-center">Aucune notification.</div>
          ) : (
            <div className="space-y-2">
              {visibleItems.map((n) => {
                const isUnread = !n.read;
                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isUnread ? 'border-brand-turquoise bg-brand-turquoise/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-brand-purple text-sm truncate">{n.title}</p>
                            <p className="text-sm text-brand-gray mt-1">{n.message}</p>
                          </div>
                          {isUnread ? <Badge className="bg-brand-turquoise text-white">Nouveau</Badge> : null}
                        </div>
                        <p className="text-xs text-brand-gray mt-2">{formatTime(n.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        {!n.read ? (
                          <Button size="sm" variant="outline" onClick={() => void markAsRead(n.id)}>
                            Marquer lu
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600"
                          onClick={() => void deleteOne(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
