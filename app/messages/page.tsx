'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Plus,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  client_id?: string;
  planner_id?: string;
  name: string;
  type: 'client' | 'vendor' | 'team';
  avatar: string;
  photoUrl?: string | null;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  attachments?: Array<{ url: string; name?: string; type?: string }>;
  time: string;
  isMe: boolean;
  read: boolean;
}

interface ClientListItem {
  id: string;
  name: string;
  photoUrl?: string | null;
}

const typeConfig = {
  client: { label: 'Client', color: 'bg-brand-turquoise' },
  vendor: { label: 'Prestataire', color: 'bg-purple-500' },
  team: { label: 'Équipe', color: 'bg-green-500' },
};

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'client' | 'vendor' | 'team'>('all');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);

  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputId = 'admin-chat-attachment-input';

  const convByClientId = useMemo(() => {
    const m = new Map<string, Conversation>();
    conversations
      .filter((c) => (c.type || 'client') === 'client' && Boolean(c.client_id))
      .forEach((c) => {
        if (c.client_id) m.set(c.client_id, c);
      });
    return m;
  }, [conversations]);

  const filteredClientList = useMemo(() => {
    const items = clients.map((c) => ({
      ...c,
      conv: convByClientId.get(c.id) || null,
    }));
    if (filter !== 'all' && filter !== 'client') return [];
    return items;
  }, [clients, convByClientId, filter]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
  }, [conversations]);

  const fetchConversations = async () => {
    if (!user?.uid) return;
    setLoadingConvs(true);
    try {
      const items = await getDocuments('conversations', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      const dedup = new Map<string, any>();
      (items as any[]).forEach((c) => {
        const key = `${c?.type || 'client'}:${c?.planner_id || ''}:${c?.client_id || ''}:${c?.vendor_id || ''}`;
        const prev = dedup.get(key);
        const prevTime = prev?.last_message_at?.toDate?.()?.getTime?.() || 0;
        const curTime = c?.last_message_at?.toDate?.()?.getTime?.() || 0;
        if (!prev || curTime >= prevTime) dedup.set(key, c);
      });

      const mapped = Array.from(dedup.values()).map((c) => {
        const name = c?.client_name || c?.name || 'Conversation';
        const avatar = (name || 'C').split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase();
        return {
          id: c.id,
          client_id: c.client_id,
          planner_id: c.planner_id,
          name,
          type: (c.type || 'client') as 'client' | 'vendor' | 'team',
          avatar,
          lastMessage: c.last_message || '',
          time: c.last_message_at?.toDate?.()?.toLocaleString('fr-FR') || '',
          unread: Number(c.unread_count_planner ?? 0),
          online: false,
        } as Conversation;
      });

      setConversations(mapped);
      return mapped;
    } catch (e) {
      console.error('Error fetching conversations:', e);
      toast.error('Erreur lors du chargement des conversations');
      return [] as Conversation[];
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchClients = async () => {
    if (!user?.uid) return;
    setLoadingClients(true);
    try {
      const items = await getDocuments('clients', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      const mapped = (items as any[])
        .map((c) => {
          const name = `${c?.name || ''}${c?.partner ? ' & ' + c.partner : ''}`.trim() || 'Client';
          return {
            id: c.id,
            name,
            photoUrl: c?.photo || null,
          } as ClientListItem;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      setClients(mapped);
    } catch (e) {
      console.error('Error fetching clients:', e);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchMyProfilePhoto = async () => {
    if (!user?.uid) return;
    try {
      const p = (await getDocument('profiles', user.uid)) as any;
      const url = p?.photo || p?.photoUrl || p?.avatar_url || null;
      setProfilePhotoUrl(url);
    } catch {
      setProfilePhotoUrl(null);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!conversationId) return;
    try {
      const items = await getDocuments('messages', [{ field: 'conversation_id', operator: '==', value: conversationId }]);
      const mapped = (items as any[])
        .sort((a, b) => {
          const da = a?.created_at?.toDate?.()?.getTime?.() || 0;
          const db = b?.created_at?.toDate?.()?.getTime?.() || 0;
          return da - db;
        })
        .map((m) => {
          const created = m?.created_at?.toDate?.() || null;
          return {
            id: m.id,
            sender: m.sender_name || (m.sender_role === 'planner' ? 'Moi' : 'Client'),
            content: m.content || '',
            attachments: (m.attachments || []) as Array<{ url: string; name?: string; type?: string }>,
            time: created ? created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            isMe: m.sender_id === user?.uid,
            read: true,
          } as Message;
        });
      setMessages(mapped);
    } catch (e) {
      console.error('Error fetching messages:', e);
      setMessages([]);
    }
  };

  const ensureConversationForClient = async (cid: string) => {
    if (!user?.uid || !cid) return null;
    const existingItems = await getDocuments('conversations', [
      { field: 'planner_id', operator: '==', value: user.uid },
      { field: 'client_id', operator: '==', value: cid },
    ]).catch(() => []);
    const existing0 = (existingItems as any[])?.find((c) => (c?.type || 'client') === 'client') || (existingItems as any[])?.[0] || null;
    if (existing0?.id) {
      const clientDoc = await getDocuments('clients', [{ field: '__name__', operator: '==', value: cid }]).catch(() => []);
      const c0 = (clientDoc as any[])?.[0] || null;
      const clientName = c0 ? `${c0.name || ''}${c0.partner ? ' & ' + c0.partner : ''}`.trim() : 'Client';
      const conv: Conversation = {
        id: existing0.id,
        client_id: cid,
        planner_id: user.uid,
        name: existing0?.client_name || existing0?.name || clientName,
        type: (existing0?.type || 'client') as 'client' | 'vendor' | 'team',
        avatar: (existing0?.client_name || clientName).split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase(),
        photoUrl: c0?.photo || null,
        lastMessage: existing0?.last_message || '',
        time: existing0?.last_message_at?.toDate?.()?.toLocaleString('fr-FR') || '',
        unread: Number(existing0?.unread_count_planner ?? 0),
        online: false,
      };
      setConversations((prev) => {
        const next = prev.filter((p) => p.id !== conv.id);
        return [conv, ...next];
      });
      return conv;
    }

    const clientDoc = await getDocuments('clients', [{ field: '__name__', operator: '==', value: cid }]).catch(() => []);
    const c0 = (clientDoc as any[])?.[0] || null;
    const clientName = c0 ? `${c0.name || ''} ${c0.partner ? '& ' + c0.partner : ''}`.trim() : 'Client';
    const created = await addDocument('conversations', {
      planner_id: user.uid,
      client_id: cid,
      type: 'client',
      client_name: clientName,
      participants: [user.uid, c0?.client_user_id].filter(Boolean),
      last_message: '',
      last_message_at: new Date(),
      unread_count_client: 0,
      unread_count_planner: 0,
      created_at: new Date(),
    });

    const conv: Conversation = {
      id: created.id,
      client_id: cid,
      planner_id: user.uid,
      name: clientName,
      type: 'client',
      avatar: clientName.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase(),
      photoUrl: c0?.photo || null,
      lastMessage: '',
      time: '',
      unread: 0,
      online: false,
    };
    setConversations((prev) => [conv, ...prev]);
    return conv;
  };

  useEffect(() => {
    if (!user?.uid) return;
    void fetchConversations();
    void fetchClients();
    void fetchMyProfilePhoto();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    if (!clientId) return;
    void (async () => {
      const conv = await ensureConversationForClient(clientId);
      if (conv) {
        setSelectedConversation(conv);
        setShowChatOnMobile(true);
        await fetchMessages(conv.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.uid]);

  useEffect(() => {
    if (selectedConversation?.id) {
      void fetchMessages(selectedConversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  const handleSend = async () => {
    if (!user?.uid || !selectedConversation?.id) return;
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const content = newMessage.trim();
      setNewMessage('');
      await addDocument('messages', {
        conversation_id: selectedConversation.id,
        sender_id: user.uid,
        sender_role: 'planner',
        sender_name: 'Moi',
        content,
        created_at: new Date(),
      });
      await updateDocument('conversations', selectedConversation.id, {
        last_message: content,
        last_message_at: new Date(),
        unread_count_client: (selectedConversation.type === 'client') ? 1 : 0,
      });

      // Notif in-app côté client (best effort)
      try {
        const convRaw = (await getDocument('conversations', selectedConversation.id)) as any;
        const clientId = convRaw?.client_id || selectedConversation.client_id || null;
        if (clientId) {
          const clientRaw = (await getDocument('clients', clientId)) as any;
          const clientUserId = clientRaw?.client_user_id || null;
          const clientName = `${clientRaw?.name || ''}${clientRaw?.partner ? ' & ' + clientRaw.partner : ''}`.trim() || 'Client';
          if (clientUserId) {
            await addDocument('notifications', {
              recipient_id: clientUserId,
              type: 'message',
              title: 'Nouveau message',
              message: `Votre wedding planner vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''}`,
              link: '/espace-client/messages',
              read: false,
              created_at: new Date(),
              planner_id: user.uid,
              client_id: clientId,
              conversation_id: selectedConversation.id,
              meta: { from: 'planner', client_name: clientName },
            });

            try {
              const { sendPushToRecipient } = await import('@/lib/push');
              await sendPushToRecipient({
                recipientId: clientUserId,
                title: 'Nouveau message',
                body: `Votre wedding planner vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''}`,
                link: '/espace-client/messages',
              });
            } catch (e) {
              console.warn('Unable to send push:', e);
            }

            try {
              const { sendEmailToUid } = await import('@/lib/email');
              await sendEmailToUid({
                recipientUid: clientUserId,
                subject: 'Nouveau message - Le Oui Parfait',
                text: `Vous avez reçu un nouveau message.\n\n${content}\n\nConnectez-vous à votre espace client pour répondre.`,
              });
            } catch (e) {
              console.warn('Unable to send email:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Unable to create client notification for message:', e);
      }

      await fetchMessages(selectedConversation.id);
    } catch (e) {
      console.error('Error sending message:', e);
      toast.error("Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const handleSendAttachment = async (file: File) => {
    if (!user?.uid || !selectedConversation?.id) return;
    setUploadingAttachment(true);
    try {
      const url = await uploadFile(file, 'chat');
      await addDocument('messages', {
        conversation_id: selectedConversation.id,
        sender_id: user.uid,
        sender_role: 'planner',
        sender_name: 'Moi',
        content: '',
        attachments: [{ url, name: file.name, type: file.type }],
        created_at: new Date(),
      });
      await updateDocument('conversations', selectedConversation.id, {
        last_message: `📎 ${file.name}`,
        last_message_at: new Date(),
        unread_count_client: (selectedConversation.type === 'client') ? 1 : 0,
      });

      // Notif in-app côté client (best effort)
      try {
        const convRaw = (await getDocument('conversations', selectedConversation.id)) as any;
        const clientId = convRaw?.client_id || selectedConversation.client_id || null;
        if (clientId) {
          const clientRaw = (await getDocument('clients', clientId)) as any;
          const clientUserId = clientRaw?.client_user_id || null;
          const clientName = `${clientRaw?.name || ''}${clientRaw?.partner ? ' & ' + clientRaw.partner : ''}`.trim() || 'Client';
          if (clientUserId) {
            await addDocument('notifications', {
              recipient_id: clientUserId,
              type: 'message',
              title: 'Nouveau message',
              message: `Votre wedding planner vous a envoyé un document : ${file.name}`,
              link: '/espace-client/messages',
              read: false,
              created_at: new Date(),
              planner_id: user.uid,
              client_id: clientId,
              conversation_id: selectedConversation.id,
              meta: { from: 'planner', client_name: clientName, attachment: file.name },
            });

            try {
              const { sendPushToRecipient } = await import('@/lib/push');
              await sendPushToRecipient({
                recipientId: clientUserId,
                title: 'Nouveau message',
                body: `Votre wedding planner vous a envoyé un document : ${file.name}`,
                link: '/espace-client/messages',
              });
            } catch (e) {
              console.warn('Unable to send push:', e);
            }

            try {
              const { sendEmailToUid } = await import('@/lib/email');
              await sendEmailToUid({
                recipientUid: clientUserId,
                subject: 'Nouveau message - Le Oui Parfait',
                text: `Vous avez reçu un nouveau message avec une pièce jointe : ${file.name}.\n\nConnectez-vous à votre espace client pour la consulter.`,
              });
            } catch (e) {
              console.warn('Unable to send email:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Unable to create client notification for attachment:', e);
      }

      await fetchMessages(selectedConversation.id);
    } catch (e) {
      console.error('Error sending attachment:', e);
      toast.error("Impossible d'envoyer le document");
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Messagerie
              {totalUnread > 0 && (
                <Badge className="bg-red-500 text-white">{totalUnread}</Badge>
              )}
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Communiquez avec vos clients et prestataires
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle conversation</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          <Card
            className={`p-4 shadow-xl border-0 overflow-hidden flex flex-col ${
              showChatOnMobile ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
                <Input placeholder="Rechercher..." className="pl-10" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className={filter === 'all' ? 'bg-brand-turquoise' : ''}>
                  Tous
                </Button>
                <Button size="sm" variant={filter === 'client' ? 'default' : 'outline'} onClick={() => setFilter('client')} className={filter === 'client' ? 'bg-brand-turquoise' : ''}>
                  Clients
                </Button>
                <Button size="sm" variant={filter === 'vendor' ? 'default' : 'outline'} onClick={() => setFilter('vendor')} className={filter === 'vendor' ? 'bg-brand-turquoise' : ''}>
                  Prestataires
                </Button>
                <Button size="sm" variant={filter === 'team' ? 'default' : 'outline'} onClick={() => setFilter('team')} className={filter === 'team' ? 'bg-brand-turquoise' : ''}>
                  Équipe
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingClients || loadingConvs ? null : filteredClientList.length === 0 ? (
                <div className="text-center text-brand-gray py-10">
                  <p className="font-medium text-brand-purple">Aucune conversation</p>
                  <p className="text-sm mt-1">Ajoutez un client pour démarrer une conversation.</p>
                </div>
              ) : filteredClientList.map((item) => {
                const conv = item.conv;
                const isSelected = Boolean(selectedConversation?.client_id && selectedConversation.client_id === item.id);
                const lastMessage = conv?.lastMessage || '';
                const time = conv?.time || '';
                const unread = conv?.unread || 0;
                const avatarFallback = (item.name || 'C').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      void (async () => {
                        const c = await ensureConversationForClient(item.id);
                        if (c) {
                          setSelectedConversation(c);
                          setShowChatOnMobile(true);
                        }
                      })();
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-turquoise/10 border-l-4 border-brand-turquoise'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          {item.photoUrl ? <AvatarImage src={item.photoUrl} alt={item.name} /> : null}
                          <AvatarFallback className="bg-brand-turquoise text-white text-sm">
                            {avatarFallback}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-brand-purple text-sm truncate">{item.name}</p>
                          <span className="text-xs text-brand-gray whitespace-nowrap ml-2">{time}</span>
                        </div>
                        <p className="text-xs text-brand-gray">Client</p>
                        <p className="text-sm text-brand-gray truncate mt-1">{lastMessage}</p>
                      </div>
                      {unread > 0 ? (
                        <Badge className="bg-brand-turquoise text-white text-xs px-2 flex-shrink-0">{unread}</Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            className={`lg:col-span-2 shadow-xl border-0 flex flex-col overflow-hidden ${
              showChatOnMobile ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => {
                    setShowChatOnMobile(false);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 text-brand-gray" />
                </Button>
                <Avatar className="h-10 w-10">
                  {selectedConversation?.photoUrl ? (
                    <AvatarImage src={selectedConversation.photoUrl} alt={selectedConversation.name} />
                  ) : null}
                  <AvatarFallback className="bg-brand-turquoise text-white">
                    {selectedConversation?.avatar || '—'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-brand-purple">
                    {selectedConversation?.name || 'Sélectionnez une conversation'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4 text-brand-gray" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation?.id && messages.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center">
                  <div className="text-center text-brand-gray max-w-md">
                    <p className="font-medium text-brand-purple">Aucun message pour le moment</p>
                    <p className="text-sm mt-1">Envoyez un premier message pour démarrer la conversation.</p>
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 ${message.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-8 w-8">
                      {message.isMe && profilePhotoUrl ? <AvatarImage src={profilePhotoUrl} alt="Moi" /> : null}
                      {!message.isMe && selectedConversation?.photoUrl ? (
                        <AvatarImage src={selectedConversation.photoUrl} alt={selectedConversation.name} />
                      ) : null}
                      <AvatarFallback className="bg-brand-turquoise text-white text-xs">
                        {message.isMe ? 'ME' : (selectedConversation?.avatar || 'CL')}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.isMe
                          ? 'bg-brand-turquoise text-white rounded-br-none'
                          : 'bg-gray-100 text-brand-purple rounded-bl-none'
                      }`}
                    >
                      {message.content ? <p className="text-sm">{message.content}</p> : null}
                      {message.attachments && message.attachments.length > 0 ? (
                        <div className="space-y-1">
                          {message.attachments.map((a, idx) => (
                            <a
                              key={`${message.id}:att:${idx}`}
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-sm underline ${message.isMe ? 'text-white' : 'text-brand-purple'}`}
                            >
                              {a.name || 'Document'}
                            </a>
                          ))}
                        </div>
                      ) : null}

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 ${
                          message.isMe ? 'text-white/70' : 'text-brand-gray'
                        }`}
                      >
                        <span className="text-xs">{message.time}</span>
                        {message.isMe ? (
                          message.read ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  id={fileInputId}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    e.target.value = '';
                    if (f) void handleSendAttachment(f);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex"
                  disabled={!selectedConversation?.id || uploadingAttachment}
                  onClick={() => document.getElementById(fileInputId)?.click()}
                >
                  <Paperclip className="h-4 w-4 text-brand-gray" />
                </Button>
                <Input
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      void handleSend();
                    }
                  }}
                />
                <Button
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  disabled={!newMessage.trim() || !selectedConversation?.id || sending || uploadingAttachment}
                  onClick={() => void handleSend()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
