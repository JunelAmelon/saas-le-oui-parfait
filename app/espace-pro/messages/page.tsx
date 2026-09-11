'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import { formatSmartTimestamp, formatFullTimestamp, groupMessagesByDate } from '@/lib/date-utils';
import { linkifyText } from '@/lib/text-utils';
import { getVendorBookings, VendorBooking } from '@/lib/vendor-helpers';

interface Conversation {
  id: string;
  vendor_id: string;
  planner_id: string;
  client_id: string;
  client_names: string;
  planner_name: string;
  lastMessage: string;
  time: string;
  unread: number;
}

interface MessageItem {
  id: string;
  sender: string;
  content: string;
  attachments?: Array<{ url: string; name?: string; type?: string }>;
  time: string;
  created_at?: Date | null;
  isMe: boolean;
  read: boolean;
}

const isImageFile = (file: File) => /^image\//i.test(file.type);
const isImageUrl = (url: string, type?: string) =>
  /^image\//i.test(type || '') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url || '');

export default function VendorMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);

  const imageInputId = 'vendor-chat-image-input';
  const documentInputId = 'vendor-chat-document-input';

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'vendor') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const detect = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches);
    detect();
    const mql = window.matchMedia('(pointer: coarse)');
    mql.addEventListener('change', detect);
    return () => mql.removeEventListener('change', detect);
  }, []);

  const allLightboxImages = useMemo(() => {
    return messages
      .flatMap((m) => (m.attachments || []))
      .filter((a) => isImageUrl(a.url, a.type))
      .map((a) => a.url);
  }, [messages]);

  const openLightbox = useCallback((url: string) => {
    const idx = allLightboxImages.indexOf(url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxImage(url);
  }, [allLightboxImages]);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      const next = prev === 0 ? allLightboxImages.length - 1 : prev - 1;
      setLightboxImage(allLightboxImages[next] || null);
      return next;
    });
  }, [allLightboxImages]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => {
      const next = prev === allLightboxImages.length - 1 ? 0 : prev + 1;
      setLightboxImage(allLightboxImages[next] || null);
      return next;
    });
  }, [allLightboxImages]);

  useEffect(() => {
    if (!lightboxImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxImage, lightboxPrev, lightboxNext]);

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
          sender: m.sender_name || (m.sender_role === 'vendor' ? 'Moi' : 'Wedding Planner'),
          content: m.content || '',
          attachments: (m.attachments || []) as Array<{ url: string; name?: string; type?: string }>,
          time: created ? created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          created_at: created,
          isMe: m.sender_id === user?.uid,
          read: true,
        } as MessageItem;
      });
    setMessages(mapped);
  };

  // Load conversations: one per booking (vendor + planner + client)
  useEffect(() => {
    if (!user?.uid || !vendor?.id) return;
    void (async () => {
      setLoading(true);
      try {
        const bks = await getVendorBookings(vendor.id, user.uid);
        setBookings(bks);

        // Fetch or create conversations for each booking
        const convs: Conversation[] = [];
        for (const bk of bks) {
          // Look for existing conversation
          const existing = await getDocuments('conversations', [
            { field: 'vendor_id', operator: '==', value: vendor.id },
          ]).catch(() => []);

          const conv =
            (existing as any[]).find(
              (c) => c.client_id === bk.client_id && c.planner_id === bk.planner_id
            ) || null;

          if (conv) {
            const lastDate = conv.last_message_at?.toDate?.() || null;
            convs.push({
              id: conv.id,
              vendor_id: vendor.id,
              planner_id: bk.planner_id,
              client_id: bk.client_id,
              client_names: bk.client_names,
              planner_name: bk.planner_name || 'Wedding Planner',
              lastMessage: conv.last_message || '',
              time: formatSmartTimestamp(lastDate),
              unread: Number(conv.unread_count_vendor ?? 0),
            });
          } else {
            // Create conversation
            const created = await addDocument('conversations', {
              vendor_id: vendor.id,
              vendor_uid: user.uid,
              planner_id: bk.planner_id,
              client_id: bk.client_id,
              type: 'vendor',
              client_name: bk.client_names,
              client_photo: bk.client_photo || null,
              vendor_name: vendor.name,
              vendor_logo: vendor.logo || null,
              participants: [bk.planner_id, user.uid],
              last_message: '',
              last_message_at: new Date(),
              unread_count_vendor: 0,
              unread_count_planner: 0,
              created_at: new Date(),
            });
            convs.push({
              id: created.id,
              vendor_id: vendor.id,
              planner_id: bk.planner_id,
              client_id: bk.client_id,
              client_names: bk.client_names,
              planner_name: bk.planner_name || 'Wedding Planner',
              lastMessage: '',
              time: '',
              unread: 0,
            });
          }
        }

        convs.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
        setConversations(convs);

        if (convs.length > 0 && !selectedConversation) {
          setSelectedConversation(convs[0]);
          setShowChatOnMobile(true);
          await fetchMessages(convs[0].id);
        }
      } catch (e) {
        console.error('Error loading vendor conversations:', e);
        toast.error('Erreur lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, vendor?.id]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowChatOnMobile(true);
    await fetchMessages(conv.id);

    // Reset unread count
    if (conv.unread > 0) {
      try {
        await updateDocument('conversations', conv.id, { unread_count_vendor: 0 });
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
        );
      } catch {
        // non-blocking
      }
    }
  };

  const handleSend = async () => {
    if (!user?.uid || !selectedConversation?.id || !vendor) return;
    if (!newMessage.trim() && pendingAttachments.length === 0) return;
    setSending(true);
    try {
      const content = newMessage.trim();
      setNewMessage('');

      let attachments: { url: string; name: string; type: string }[] | undefined;
      let attachmentPreview: string | null = null;

      if (pendingAttachments.length > 0) {
        attachments = [];
        for (const file of pendingAttachments) {
          const url = await uploadFile(file, 'chat');
          attachments.push({ url, name: file.name, type: file.type });
        }
        const imageCount = pendingAttachments.filter(f => /^image\//i.test(f.type)).length;
        const docCount = pendingAttachments.length - imageCount;
        const parts: string[] = [];
        if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
        if (docCount > 0) parts.push(`${docCount} document${docCount > 1 ? 's' : ''}`);
        attachmentPreview = `📎 ${parts.join(' + ')}`;
        setPendingAttachments([]);
      }

      await addDocument('messages', {
        conversation_id: selectedConversation.id,
        sender_id: user.uid,
        sender_role: 'vendor',
        sender_name: vendor.name || 'Prestataire',
        content,
        ...(attachments ? { attachments } : {}),
        created_at: new Date(),
      });

      const lastMessageText = attachmentPreview
        ? content
          ? `${content.slice(0, 60)} ${attachmentPreview}`
          : attachmentPreview
        : content;

      await updateDocument('conversations', selectedConversation.id, {
        last_message: lastMessageText,
        last_message_at: new Date(),
        unread_count_planner: 1,
      });

      // Notify the planner
      try {
        await addDocument('notifications', {
          recipient_id: selectedConversation.planner_id,
          type: 'message',
          title: `Message de ${vendor.name}`,
          message: `${vendor.name} vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''} (mariage ${selectedConversation.client_names})`,
          link: `/messages?vendorId=${selectedConversation.vendor_id}&clientId=${selectedConversation.client_id}`,
          read: false,
          created_at: new Date(),
          planner_id: selectedConversation.planner_id,
          client_id: selectedConversation.client_id,
          conversation_id: selectedConversation.id,
        });
      } catch {
        // non-blocking
      }

      // Send email to planner
      try {
        const { sendEmailToUid } = await import('@/lib/email');
        await sendEmailToUid({
          recipientUid: selectedConversation.planner_id,
          subject: `Message de ${vendor.name} - Le Oui Parfait`,
          text: `Bonjour,\n\n${vendor.name} vous a envoyé un message${content ? ` :\n\n${content}` : ''}${attachmentPreview ? `\n\nAvec : ${attachmentPreview.replace('📎 ', '')}` : ''}\n\nMariage : ${selectedConversation.client_names}\n\nConnectez-vous à votre espace admin pour répondre.\n\nLe Oui Parfait`,
        });
      } catch (e) {
        console.warn('Unable to send email to planner:', e);
      }

      // Send push to planner
      try {
        const { sendPushToRecipient } = await import('@/lib/push');
        await sendPushToRecipient({
          recipientId: selectedConversation.planner_id,
          title: `Message de ${vendor.name}`,
          body: content ? content.slice(0, 100) : 'Nouveau message',
          link: `/messages?vendorId=${selectedConversation.vendor_id}&clientId=${selectedConversation.client_id}`,
        });
      } catch (e) {
        console.warn('Unable to send push to planner:', e);
      }

      await fetchMessages(selectedConversation.id);

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: lastMessageText, time: formatSmartTimestamp(new Date()) }
            : c
        )
      );
    } catch (e) {
      console.error('Error sending message:', e);
      toast.error("Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentsSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingAttachments(prev => [...prev, ...Array.from(files)]);
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-3 h-[calc(100vh-80px)] flex flex-col">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-[#4B4456] px-5 py-3 sm:px-6 sm:py-4 shrink-0">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#88b7b5]/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] tracking-label uppercase text-[#4B4456] bg-white/90 px-3 py-1 rounded-full mb-2">
                Messagerie
              </span>
              <h1 className="font-baskerville text-xl sm:text-2xl text-[#FAF9F7]">
                Échangez avec vos wedding planners
              </h1>
            </div>
            <div className="hidden sm:flex w-11 h-11 rounded-full bg-white/10 items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-[#88b7b5]" />
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 min-h-0 flex gap-0">
          {/* Conversations list (sidebar) */}
          <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[280px] shrink-0 border-r border-[rgba(75,68,86,0.08)] bg-white rounded-l-3xl overflow-hidden`}>
            <div className="px-4 py-3 border-b border-[rgba(75,68,86,0.08)]">
              <p className="text-sm font-semibold text-[#4B4456]">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#88b7b5]" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MessageSquare className="h-8 w-8 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#9C97A3]">Aucune conversation.</p>
                  <p className="text-xs text-[#9C97A3] mt-1">
                    Vos conversations apparaîtront ici une fois que vous serez sélectionné pour un mariage.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[rgba(75,68,86,0.04)] ${
                      selectedConversation?.id === conv.id
                        ? 'bg-[rgba(136,183,181,0.08)]'
                        : 'hover:bg-[rgba(75,68,86,0.03)]'
                    }`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-[#4B4456] text-white text-xs">
                        {conv.client_names.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#4B4456] truncate">
                          {conv.client_names}
                        </span>
                        {conv.unread > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center shrink-0">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9C97A3] truncate">{conv.planner_name}</p>
                      <p className="text-[11px] text-[#9C97A3] truncate mt-0.5">
                        {conv.lastMessage || 'Aucun message'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat panel */}
          <Card className={`${showChatOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden border border-[rgba(75,68,86,0.06)] shadow-sm rounded-r-3xl bg-white min-w-0`}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[rgba(75,68,86,0.08)] flex items-center gap-3 shrink-0">
              {showChatOnMobile && (
                <button
                  onClick={() => setShowChatOnMobile(false)}
                  className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-[#4B4456] hover:bg-[rgba(75,68,86,0.05)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              {selectedConversation ? (
                <>
                  <Avatar className="h-10 w-10 ring-2 ring-[#88b7b5]/20">
                    <AvatarFallback className="bg-[#4B4456] text-white text-xs">
                      {selectedConversation.client_names.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-baskerville text-[#4B4456] truncate">
                      {selectedConversation.client_names}
                    </p>
                    <p className="text-[11px] text-[#9C97A3] truncate">
                      {selectedConversation.planner_name}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#9C97A3]">Sélectionnez une conversation</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#FAF9F7]/40">
              {!loading && selectedConversation?.id && messages.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center">
                  <div className="text-center text-[#9C97A3] max-w-md">
                    <div className="w-12 h-12 rounded-full bg-[rgba(75,68,86,0.06)] flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-5 h-5 text-[#4B4456]" />
                    </div>
                    <p className="font-medium text-[#4B4456] text-sm">Aucun message pour le moment</p>
                    <p className="text-xs mt-1">Envoyez un message pour démarrer la conversation.</p>
                  </div>
                </div>
              ) : null}

              {groupMessagesByDate(messages).map((group) => (
                <div key={group.date.toISOString()} className="space-y-4">
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-[rgba(75,68,86,0.08)]" />
                    <span className="text-xs font-medium text-[#4B4456]/60 px-3 py-1 bg-white/80 rounded-full shadow-sm">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-[rgba(75,68,86,0.08)]" />
                  </div>
                  {group.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${
                          message.isMe ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div
                          className={`p-3.5 shadow-sm ${
                            message.isMe
                              ? 'bg-[#88b7b5] text-white rounded-2xl rounded-br-md'
                              : 'bg-white text-[#4B4456] rounded-2xl rounded-bl-md border border-[rgba(75,68,86,0.06)]'
                          }`}
                        >
                          {message.content ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {linkifyText(message.content)}
                            </p>
                          ) : null}
                          {message.attachments && message.attachments.length > 0 ? (
                            <div className="space-y-2 mt-1">
                              {message.attachments.filter(a => isImageUrl(a.url, a.type)).length > 0 && (
                                <div className="grid gap-1 grid-cols-2">
                                  {message.attachments.filter(a => isImageUrl(a.url, a.type)).map((a, idx) => (
                                    <button
                                      key={`${message.id}:img:${idx}`}
                                      onClick={() => openLightbox(a.url)}
                                      className="relative overflow-hidden rounded-lg"
                                    >
                                      <img src={a.url} alt={a.name || 'Image'} className="w-full h-32 object-cover" loading="lazy" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              {message.attachments.filter(a => !isImageUrl(a.url, a.type)).length > 0 && (
                                <div className="space-y-1.5">
                                  {message.attachments.filter(a => !isImageUrl(a.url, a.type)).map((a, idx) => (
                                    <a
                                      key={`${message.id}:doc:${idx}`}
                                      href={a.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={a.name}
                                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                                        message.isMe
                                          ? 'bg-white/15 hover:bg-white/25 text-white'
                                          : 'bg-[rgba(75,68,86,0.05)] hover:bg-[rgba(75,68,86,0.1)] text-[#4B4456]'
                                      }`}
                                    >
                                      <FileText className="w-4 h-4 shrink-0" />
                                      <span className="text-sm truncate flex-1">{a.name || 'Document'}</span>
                                      <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                          <div className={`flex items-center justify-end gap-1 mt-1.5 ${message.isMe ? 'text-white/70' : 'text-[#9C97A3]'}`}>
                            <span className="text-[10px]" title={formatFullTimestamp(message.created_at)}>{message.time}</span>
                            {message.isMe && (message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[rgba(75,68,86,0.08)] shrink-0 relative">
              <input
                id={imageInputId}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleAttachmentsSelected(e.target.files); e.target.value = ''; }}
              />
              <input
                id={documentInputId}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { handleAttachmentsSelected(e.target.files); e.target.value = ''; }}
              />

              {pendingAttachments.length > 0 && (
                <div className="mb-3 p-3 rounded-2xl bg-[rgba(75,68,86,0.04)] border border-[rgba(75,68,86,0.06)]">
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((file, idx) => (
                      <div key={idx} className="relative flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[rgba(75,68,86,0.06)] shadow-sm">
                        {isImageFile(file) ? <ImageIcon className="h-4 w-4 text-[#88b7b5] shrink-0" /> : <FileText className="h-4 w-4 text-[#4B4456] shrink-0" />}
                        <span className="text-xs text-[#4B4456] max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => removePendingAttachment(idx)} className="w-5 h-5 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-16 left-4 z-50 bg-white rounded-2xl shadow-lg border border-[rgba(75,68,86,0.08)] p-2 min-w-[180px]">
                    <button
                      onClick={() => { setShowAttachMenu(false); document.getElementById(imageInputId)?.click(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(75,68,86,0.04)] text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#88b7b5]/10 flex items-center justify-center shrink-0">
                        <ImageIcon className="h-4 w-4 text-[#88b7b5]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#4B4456]">Images</p>
                        <p className="text-[11px] text-[#9C97A3]">Photos, images</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setShowAttachMenu(false); document.getElementById(documentInputId)?.click(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(75,68,86,0.04)] text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-[rgba(75,68,86,0.1)] flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#4B4456]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#4B4456]">Documents</p>
                        <p className="text-[11px] text-[#9C97A3]">PDF, Word...</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 bg-[#FAF9F7]/60 rounded-full pl-2 pr-2 py-2 border border-[rgba(75,68,86,0.08)]">
                <button
                  title="Joindre un fichier"
                  disabled={!selectedConversation?.id || sending}
                  onClick={() => setShowAttachMenu(v => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#9C97A3] hover:bg-white transition-colors shrink-0 disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  placeholder="Écrivez un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-[#4B4456] placeholder:text-[#9C97A3] resize-none min-h-[24px] max-h-[100px] py-1"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                      e.preventDefault();
                      if (newMessage.trim() || pendingAttachments.length > 0) void handleSend();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                  }}
                />
                <button
                  title="Envoyer"
                  disabled={(!newMessage.trim() && pendingAttachments.length === 0) || !selectedConversation?.id || sending}
                  onClick={() => void handleSend()}
                  className="w-9 h-9 rounded-full bg-[#88b7b5] hover:bg-[#6a9a98] disabled:opacity-40 flex items-center justify-center text-white transition-colors shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Lightbox */}
        {lightboxImage && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[#88b7b5] hover:bg-[#6a9a98] flex items-center justify-center text-white shadow-lg z-10">
              <X className="w-6 h-6" />
            </button>
            {allLightboxImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); lightboxPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); lightboxNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            <img src={lightboxImage} alt="Image" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    </VendorDashboardLayout>
  );
}
