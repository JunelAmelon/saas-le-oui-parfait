'use client';

import { Card } from '@/components/ui/card';
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
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
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
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputId = 'client-chat-attachment-input';

  const clientName = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  const daysRemaining = event?.event_date ? 0 : 0;

  const fetchMessages = async (conversationId: string) => {
    const items = await getDocuments('messages', [
      { field: 'conversation_id', operator: '==', value: conversationId },
    ]);
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

  const fetchAgencyLogo = async () => {
    try {
      const a = (await getDocument('agency', 'leOuiParfait')) as any;
      const url = a?.logoUrl || null;
      setAgencyLogoUrl(url);
    } catch {
      setAgencyLogoUrl(null);
    }
  };

  const ensureConversation = async () => {
    if (!user?.uid || !client?.id || !client?.planner_id) return null;
    const existing = await getDocuments('conversations', [
      { field: 'client_id', operator: '==', value: client.id },
    ]);
    const conv0 =
      (existing as any[])?.find((c) => c?.planner_id === client.planner_id) ||
      (existing as any[])?.[0] ||
      null;
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
        void fetchAgencyLogo();
        const conv = await ensureConversation();
        if (!conv?.id) {
          setLoading(false);
          return;
        }
        const convDoc = await getDocuments('conversations', [
          { field: '__name__', operator: '==', value: conv.id },
        ]).catch(() => []);
        const c0 = (convDoc as any[])?.[0] || null;
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

      try {
        const plannerId = client?.planner_id || null;
        const clientId = client?.id || null;
        if (plannerId) {
          await addDocument('notifications', {
            recipient_id: plannerId,
            type: 'message',
            title: 'Nouveau message client',
            message: `${clientName} vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''}`,
            link: clientId ? `/messages?clientId=${clientId}` : '/messages',
            read: false,
            created_at: new Date(),
            planner_id: plannerId,
            client_id: clientId,
            conversation_id: selectedConversation.id,
            meta: { from: 'client', client_name: clientName },
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: plannerId,
              title: 'Nouveau message client',
              body: `${clientName} vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''}`,
              link: clientId ? `/messages?clientId=${clientId}` : '/messages',
            });
          } catch (e) {
            console.warn('Unable to send push:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: plannerId,
              subject: 'Nouveau message client - Le Oui Parfait',
              text: `${clientName} vous a envoyé un nouveau message.\n\n${content}\n\nOuvrez la conversation dans Le Oui Parfait.`,
            });
          } catch (e) {
            console.warn('Unable to send email:', e);
          }
        }
      } catch (e) {
        console.warn('Unable to create planner notification for message:', e);
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

      try {
        const plannerId = client?.planner_id || null;
        const clientId = client?.id || null;
        if (plannerId) {
          await addDocument('notifications', {
            recipient_id: plannerId,
            type: 'message',
            title: 'Nouveau message client',
            message: `${clientName} vous a envoyé un document : ${file.name}`,
            link: clientId ? `/messages?clientId=${clientId}` : '/messages',
            read: false,
            created_at: new Date(),
            planner_id: plannerId,
            client_id: clientId,
            conversation_id: selectedConversation.id,
            meta: { from: 'client', client_name: clientName, attachment: file.name },
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: plannerId,
              title: 'Nouveau message client',
              body: `${clientName} vous a envoyé un document : ${file.name}`,
              link: clientId ? `/messages?clientId=${clientId}` : '/messages',
            });
          } catch (e) {
            console.warn('Unable to send push:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: plannerId,
              subject: 'Nouveau message client - Le Oui Parfait',
              text: `${clientName} vous a envoyé un message avec une pièce jointe : ${file.name}.\n\nOuvrez la conversation dans Le Oui Parfait.`,
            });
          } catch (e) {
            console.warn('Unable to send email:', e);
          }
        }
      } catch (e) {
        console.warn('Unable to create planner notification for attachment:', e);
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
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="space-y-5 h-[calc(100vh-120px)] flex flex-col">

        {/* ---------- HERO COMPACT ---------- */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-purple px-6 py-5 sm:px-8 sm:py-6 shrink-0">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-brand-turquoise/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1 rounded-full mb-2">
                Messagerie
              </span>
              <h1 className="font-baskerville text-2xl sm:text-3xl text-brand-beige">
                Échangez avec votre wedding planner
              </h1>
            </div>
            <div className="hidden sm:flex w-11 h-11 rounded-full bg-white/10 items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-brand-turquoise" />
            </div>
          </div>
        </div>

        {/* ---------- CHAT ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">

          {/* Liste des conversations */}
          <Card
            className={`p-4 border border-brand-purple/8 shadow-sm rounded-3xl bg-white overflow-hidden flex flex-col ${
              showChatOnMobile ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
              <Input
                placeholder="Rechercher..."
                className="pl-11 h-11 rounded-xl border-brand-purple/10 bg-brand-beige/60"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {loading ? null : conversations.length === 0 ? (
                <div className="text-center text-brand-gray py-10">
                  <p className="font-medium text-brand-purple text-sm">Aucune conversation</p>
                  <p className="text-xs mt-1">Démarrez une conversation en envoyant un premier message.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv);
                      setShowChatOnMobile(true);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-brand-turquoise/12' : 'hover:bg-brand-beige/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                          {agencyLogoUrl || plannerPhotoUrl ? (
                            <AvatarImage src={agencyLogoUrl || plannerPhotoUrl || undefined} alt="Wedding Planner" />
                          ) : null}
                          <AvatarFallback className="bg-brand-purple text-white text-sm">
                            {conv.avatar}
                          </AvatarFallback>
                        </Avatar>
                        {conv.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-brand-turquoise border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-brand-purple text-sm truncate">{conv.name}</p>
                          <span className="text-[10px] text-brand-gray shrink-0">{conv.time}</span>
                        </div>
                        <p className="text-xs text-brand-gray truncate mt-0.5">{conv.lastMessage || 'Aucun message'}</p>
                      </div>
                      {conv.unread > 0 && (
                        <span className="bg-brand-turquoise text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Fenêtre de chat */}
          <Card
            className={`lg:col-span-2 border border-brand-purple/8 shadow-sm rounded-3xl bg-white flex flex-col overflow-hidden ${
              showChatOnMobile ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Header conversation */}
            <div className="px-5 py-4 border-b border-brand-purple/8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-brand-gray hover:bg-brand-purple/8"
                  onClick={() => setShowChatOnMobile(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar className="h-10 w-10 ring-2 ring-brand-turquoise/20">
                  {agencyLogoUrl || plannerPhotoUrl ? (
                    <AvatarImage src={agencyLogoUrl || plannerPhotoUrl || undefined} alt="Wedding Planner" />
                  ) : null}
                  <AvatarFallback className="bg-brand-purple text-white">
                    {selectedConversation?.avatar || '—'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-baskerville text-brand-purple">
                    {selectedConversation?.name || 'Sélectionnez une conversation'}
                  </p>
                  {selectedConversation?.online && (
                    <p className="text-[11px] text-brand-turquoise-hover flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-turquoise" /> En ligne
                    </p>
                  )}
                </div>
              </div>
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-brand-gray hover:bg-brand-purple/8">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-brand-beige/40">
              {!loading && selectedConversation?.id && messages.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center">
                  <div className="text-center text-brand-gray max-w-md">
                    <div className="w-12 h-12 rounded-full bg-brand-purple/8 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-5 h-5 text-brand-purple" />
                    </div>
                    <p className="font-medium text-brand-purple text-sm">Aucun message pour le moment</p>
                    <p className="text-xs mt-1">Envoyez un message pour démarrer la conversation.</p>
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${
                      message.isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      {message.isMe && client?.photo ? <AvatarImage src={client.photo} alt="Moi" /> : null}
                      {!message.isMe && (agencyLogoUrl || plannerPhotoUrl) ? (
                        <AvatarImage src={agencyLogoUrl || plannerPhotoUrl || undefined} alt="Wedding Planner" />
                      ) : null}
                      <AvatarFallback
                        className={`text-[10px] ${message.isMe ? 'bg-brand-purple' : 'bg-brand-turquoise'} text-white`}
                      >
                        {message.isMe ? 'ME' : 'WP'}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`p-3.5 shadow-sm ${
                        message.isMe
                          ? 'bg-brand-turquoise text-white rounded-2xl rounded-br-sm'
                          : 'bg-white text-brand-purple rounded-2xl rounded-bl-sm border border-brand-purple/6'
                      }`}
                    >
                      {message.content ? <p className="text-sm leading-relaxed">{message.content}</p> : null}
                      {message.attachments && message.attachments.length > 0 ? (
                        <div className="space-y-1">
                          {message.attachments.map((a, idx) => (
                            <a
                              key={`${message.id}:att:${idx}`}
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-sm underline flex items-center gap-1.5 ${
                                message.isMe ? 'text-white' : 'text-brand-purple'
                              }`}
                            >
                              <Paperclip className="w-3 h-3" />
                              {a.name || 'Document'}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1.5 ${
                          message.isMe ? 'text-white/70' : 'text-brand-gray'
                        }`}
                      >
                        <span className="text-[10px]">{message.time}</span>
                        {message.isMe &&
                          (message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-brand-purple/8 shrink-0">
              <div className="flex items-center gap-2 bg-brand-beige/60 rounded-full pl-2 pr-2 py-2">
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
                <button
                  disabled={!selectedConversation?.id || uploadingAttachment}
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-brand-gray hover:bg-white transition-colors shrink-0 disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-brand-purple placeholder:text-brand-gray"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      void handleSend();
                    }
                  }}
                />
                <button
                  disabled={!newMessage.trim() || !selectedConversation?.id || sending || uploadingAttachment}
                  onClick={() => void handleSend()}
                  className="w-9 h-9 rounded-full bg-brand-turquoise hover:bg-brand-turquoise-hover disabled:opacity-40 disabled:hover:bg-brand-turquoise flex items-center justify-center text-white transition-colors shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ClientDashboardLayout>
  );
}