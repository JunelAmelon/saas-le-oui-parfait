'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
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
  ArrowLeft,
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface Conversation {
  id: string;
  client_id: string;
  planner_id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface MessageItem {
  id: string;
  sender: string;
  content: string;
  attachments?: Array<{ url: string; name?: string; type?: string }>;
  time: string;
  isMe: boolean;
  read: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { client, event } = useClientData();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  const [plannerPhotoUrl, setPlannerPhotoUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputId = 'client-chat-attachment-input';

  const clientName = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  const daysRemaining = event?.event_date ? 0 : 0;

  const fetchMessages = async (conversationId: string) => {
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
          sender: m.sender_name || (m.sender_role === 'client' ? 'Moi' : 'Wedding Planner'),
          content: m.content || '',
          attachments: (m.attachments || []) as Array<{ url: string; name?: string; type?: string }>,
          time: created ? created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          isMe: m.sender_id === user?.uid,
          read: true,
        } as MessageItem;
      });
    setMessages(mapped);
  };

  const fetchPlannerPhoto = async () => {
    if (!client?.planner_id) return;
    try {
      const p = (await getDocument('profiles', client.planner_id)) as any;
      const url = p?.photo || p?.photoUrl || p?.avatar_url || null;
      setPlannerPhotoUrl(url);
    } catch {
      setPlannerPhotoUrl(null);
    }
  };

  const ensureConversation = async () => {
    if (!user?.uid || !client?.id || !client?.planner_id) return null;
    const existing = await getDocuments('conversations', [{ field: 'client_id', operator: '==', value: client.id }]);
    const conv0 = (existing as any[])?.find((c) => c?.planner_id === client.planner_id) || (existing as any[])?.[0] || null;
    if (conv0?.id) {
      return conv0;
    }

    const created = await addDocument('conversations', {
      planner_id: client.planner_id,
      client_id: client.id,
      type: 'client',
      client_name: clientName,
      participants: [client.planner_id, user.uid],
      last_message: '',
      last_message_at: new Date(),
      unread_count_client: 0,
      unread_count_planner: 0,
      created_at: new Date(),
    });
    return { id: created.id };
  };

  useEffect(() => {
    if (!user?.uid || !client?.id) return;
    void (async () => {
      setLoading(true);
      try {
        void fetchPlannerPhoto();
        const conv = await ensureConversation();
        if (!conv?.id) {
          setLoading(false);
          return;
        }
        const convDoc = await getDocuments('conversations', [{ field: '__name__', operator: '==', value: conv.id }]).catch(() => []);
        const c0 = (convDoc as any[])?.[0] || null;
        const name = c0?.client_name || 'Wedding Planner';
        const mapped: Conversation = {
          id: conv.id,
          client_id: client.id,
          planner_id: client.planner_id,
          name: 'Votre Wedding Planner',
          avatar: 'WP',
          lastMessage: c0?.last_message || '',
          time: c0?.last_message_at?.toDate?.()?.toLocaleString('fr-FR') || '',
          unread: Number(c0?.unread_count_client ?? 0),
          online: false,
        };
        setConversations([mapped]);
        setSelectedConversation(mapped);
        setShowChatOnMobile(true);
        await fetchMessages(conv.id);
      } catch (e) {
        console.error('Error loading conversations:', e);
        toast.error('Erreur lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, client?.id]);

  useEffect(() => {
    if (!conversationIdParam) return;
    const match = conversations.find((c) => c.id === conversationIdParam) || null;
    if (match) {
      setSelectedConversation(match);
      setShowChatOnMobile(true);
      void fetchMessages(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdParam, conversations.length]);

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
        sender_role: 'client',
        sender_name: 'Moi',
        content,
        created_at: new Date(),
      });
      await updateDocument('conversations', selectedConversation.id, {
        last_message: content,
        last_message_at: new Date(),
        unread_count_planner: 1,
      });
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
        sender_role: 'client',
        sender_name: 'Moi',
        content: '',
        attachments: [{ url, name: file.name, type: file.type }],
        created_at: new Date(),
      });
      await updateDocument('conversations', selectedConversation.id, {
        last_message: `📎 ${file.name}`,
        last_message_at: new Date(),
        unread_count_planner: 1,
      });
      await fetchMessages(selectedConversation.id);
    } catch (e) {
      console.error('Error sending attachment:', e);
      toast.error("Impossible d'envoyer le document");
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Messages
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Communiquez avec votre wedding planner et vos prestataires
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[400px]">
          <Card
            className={`p-4 shadow-xl border-0 overflow-hidden flex flex-col ${
              showChatOnMobile ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
                <Input placeholder="Rechercher..." className="pl-10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? null : conversations.length === 0 ? (
                <div className="text-center text-brand-gray py-10">
                  <p className="font-medium text-brand-purple">Aucune conversation</p>
                  <p className="text-sm mt-1">Démarrez une conversation en envoyant un premier message.</p>
                </div>
              ) : conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    setShowChatOnMobile(true);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-brand-turquoise/10 border-l-4 border-brand-turquoise'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-brand-turquoise text-white text-sm">
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-brand-purple text-sm truncate">
                          {conv.name}
                        </p>
                        <span className="text-xs text-brand-gray">{conv.time}</span>
                      </div>
                      <p className="text-sm text-brand-gray truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="bg-brand-turquoise text-white text-xs px-2">
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
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
                  <AvatarFallback className="bg-brand-turquoise text-white">
                    {selectedConversation?.avatar || '—'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-brand-purple">
                    {selectedConversation?.name || 'Sélectionnez une conversation'}
                  </p>
                  <p className="text-xs text-brand-gray">
                    {selectedConversation?.online ? 'En ligne' : ''}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4 text-brand-gray" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!loading && selectedConversation?.id && messages.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center">
                  <div className="text-center text-brand-gray max-w-md">
                    <p className="font-medium text-brand-purple">Aucun message pour le moment</p>
                    <p className="text-sm mt-1">Envoyez un message pour démarrer la conversation.</p>
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
                      {message.isMe && client?.photo ? <AvatarImage src={client.photo} alt="Moi" /> : null}
                      {!message.isMe && plannerPhotoUrl ? <AvatarImage src={plannerPhotoUrl} alt="Wedding Planner" /> : null}
                      <AvatarFallback className="bg-brand-turquoise text-white text-xs">
                        {message.isMe ? 'ME' : 'WP'}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-lg ${
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
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        message.isMe ? 'text-white/70' : 'text-brand-gray'
                      }`}>
                        <span className="text-xs">{message.time}</span>
                        {message.isMe && (
                          message.read ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
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
    </ClientDashboardLayout>
  );
}
