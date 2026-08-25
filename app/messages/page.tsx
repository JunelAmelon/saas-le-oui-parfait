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
  FileText,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Plus,
  Users,
  ArrowLeft,
  Trash2,
  X,
  ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocument, getDocuments, updateDocument, deleteDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import { formatSmartTimestamp, formatFullTimestamp, groupMessagesByDate } from '@/lib/date-utils';
import { linkifyText } from '@/lib/text-utils';

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
  lastMessageAtMs?: number;
  unread: number;
  online: boolean;
  deletedForPlanner?: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  attachments?: Array<{ url: string; name?: string; type?: string }>;
  time: string;
  created_at?: Date | null;
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

const isImageFile = (file: File) => /^image\//i.test(file.type);

const isImageUrl = (url: string, type?: string) =>
  /^image\//i.test(type || '') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url || '');

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const vendorId = searchParams.get('vendorId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'client' | 'vendor' | 'team'>('all');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [vendorsMap, setVendorsMap] = useState<Map<string, any>>(new Map());
  const vendorsMapRef = useRef<Map<string, any>>(new Map());
  useEffect(() => { vendorsMapRef.current = vendorsMap; }, [vendorsMap]);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const imageInputId = 'admin-chat-image-input';
  const documentInputId = 'admin-chat-document-input';

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const detect = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches);
    detect();
    const mql = window.matchMedia('(pointer: coarse)');
    mql.addEventListener('change', detect);
    return () => mql.removeEventListener('change', detect);
  }, []);

  const convByClientId = useMemo(() => {
    const m = new Map<string, Conversation>();
    conversations
      .filter((c) => (c.type || 'client') === 'client' && Boolean(c.client_id))
      .forEach((c) => {
        if (c.client_id) m.set(c.client_id, c);
      });
    return m;
  }, [conversations]);

  // Conversations vendor/team pour les filtres dédiés
  const filteredProConversations = useMemo(() => {
    if (filter !== 'vendor' && filter !== 'team') return [];
    return conversations
      .filter((c) => c.type === filter && !c.deletedForPlanner)
      .slice()
      .sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
  }, [conversations, filter]);

  const filteredClientList = useMemo(() => {
    const items = clients
      .map((c) => ({
        ...c,
        conv: convByClientId.get(c.id) || null,
      }))
      .filter((item) => !item.conv?.deletedForPlanner);
    if (filter !== 'all' && filter !== 'client') return [];
    return items
      .slice()
      .sort((a, b) => {
        const am = a?.conv?.lastMessageAtMs || 0;
        const bm = b?.conv?.lastMessageAtMs || 0;
        return bm - am;
      });
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
        const convType = (c.type || 'client') as 'client' | 'vendor' | 'team';
        // For vendor conversations, show vendor contact name + couple context
        const vendorDoc = convType === 'vendor' && c?.vendor_id ? vendorsMapRef.current.get(c.vendor_id) : null;
        const name = convType === 'vendor'
          ? (vendorDoc?.contact_name || c?.vendor_name || vendorDoc?.name || c?.name || 'Prestataire')
          : (c?.client_name || c?.name || 'Conversation');
        const avatar = (name || 'C').split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase();
        const lastAtMs = c?.last_message_at?.toDate?.()?.getTime?.() || 0;
        const lastMessageDate = c?.last_message_at?.toDate?.() || null;
        return {
          id: c.id,
          client_id: c.client_id,
          planner_id: c.planner_id,
          name,
          type: convType,
          avatar,
          photoUrl: convType === 'vendor' ? (c?.client_photo || c?.vendor_logo || null) : (c?.photo_url || null),
          lastMessage: c.last_message || '',
          time: formatSmartTimestamp(lastMessageDate),
          lastMessageAtMs: lastAtMs,
          unread: Number(c.unread_count_planner ?? 0),
          online: false,
          deletedForPlanner: c.deleted_for_planner === true,
        } as Conversation;
      });

      const sorted = mapped.slice().sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
      setConversations(sorted);
      return sorted;
    } catch (e) {
      console.error('Error fetching conversations:', e);
      toast.error('Erreur lors du chargement des conversations');
      return [] as Conversation[];
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchVendors = async () => {
    if (!user?.uid) return;
    try {
      const items = await getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      const m = new Map<string, any>();
      (items as any[]).forEach((v) => m.set(v.id, v));
      setVendorsMap(m);
    } catch (e) {
      console.error('Error fetching vendors:', e);
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
            created_at: created,
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

  const markConversationAsRead = async (convId: string) => {
    if (!convId) return;
    const isUnread =
      conversations.some((c) => c.id === convId && (c.unread || 0) > 0) ||
      (selectedConversation?.id === convId && (selectedConversation.unread || 0) > 0);
    if (!isUnread) return;

    try {
      await updateDocument('conversations', convId, { unread_count_planner: 0 });
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c)));
      setSelectedConversation((prev) => (prev?.id === convId ? { ...prev, unread: 0 } : prev));
    } catch (e) {
      console.error('Error marking conversation as read:', e);
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
      if (existing0.deleted_for_planner === true) {
        await updateDocument('conversations', existing0.id, { deleted_for_planner: false });
        existing0.deleted_for_planner = false;
      }
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
        lastMessageAtMs: existing0?.last_message_at?.toDate?.()?.getTime?.() || 0,
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
      lastMessageAtMs: Date.now(),
      unread: 0,
      online: false,
    };
    setConversations((prev) => [conv, ...prev]);
    return conv;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user?.uid) return;
    void fetchVendors().then(() => fetchConversations());
    void fetchClients();
    void fetchMyProfilePhoto();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    if (!clientId && !vendorId) return;
    void (async () => {
      // If vendorId is present, find the vendor conversation
      if (vendorId) {
        try {
          const vendorConvs = await getDocuments('conversations', [
            { field: 'vendor_id', operator: '==', value: vendorId },
          ]);
          // Filter by planner_id client-side to avoid composite index
          const mine = (vendorConvs as any[]).find(
            (c) => c.planner_id === user.uid && (!clientId || c.client_id === clientId)
          );
          if (mine) {
            const name = mine.vendor_name || mine.client_name || 'Prestataire';
            const avatar = (name || 'P').split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase();
            const lastAtMs = mine?.last_message_at?.toDate?.()?.getTime?.() || 0;
            const lastMessageDate = mine?.last_message_at?.toDate?.() || null;
            const conv = {
              id: mine.id,
              client_id: mine.client_id,
              planner_id: mine.planner_id,
              name,
              type: 'vendor' as const,
              avatar,
              photoUrl: mine?.client_photo || mine?.vendor_logo || null,
              lastMessage: mine.last_message || '',
              time: formatSmartTimestamp(lastMessageDate),
              lastMessageAtMs: lastAtMs,
              unread: Number(mine.unread_count_planner ?? 0),
              online: false,
              deletedForPlanner: mine.deleted_for_planner === true,
            } as Conversation;
            setSelectedConversation(conv);
            setShowChatOnMobile(true);
            // Set filter to vendor so the conversation is visible in the list
            setFilter('vendor');
            return;
          }
        } catch (e) {
          console.error('Error finding vendor conversation:', e);
        }
      }
      // Fallback: open client conversation
      if (clientId) {
        const conv = await ensureConversationForClient(clientId);
        if (conv) {
          setSelectedConversation(conv);
          setShowChatOnMobile(true);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendorId, user?.uid]);

  useEffect(() => {
    if (selectedConversation?.id) {
      void markConversationAsRead(selectedConversation.id);
      void fetchMessages(selectedConversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  const handleSend = async () => {
    if (!user?.uid || !selectedConversation?.id) return;
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
        sender_role: 'planner',
        sender_name: 'Moi',
        content,
        ...(attachments ? { attachments } : {}),
        created_at: new Date(),
      });
      const now = new Date();
      const lastMessageText = attachmentPreview
        ? content
          ? `${content.slice(0, 60)} ${attachmentPreview}`
          : attachmentPreview
        : content;
      await updateDocument('conversations', selectedConversation.id, {
        last_message: lastMessageText,
        last_message_at: now,
        unread_count_client: (selectedConversation.type === 'client') ? 1 : 0,
        unread_count_vendor: (selectedConversation.type === 'vendor') ? 1 : 0,
      });

      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: lastMessageText, lastMessageAtMs: now.getTime(), time: formatSmartTimestamp(now) }
            : c
        );
        return next.sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
      });
      setSelectedConversation((prev) =>
        prev?.id === selectedConversation.id
          ? { ...prev, lastMessage: lastMessageText, lastMessageAtMs: now.getTime(), time: formatSmartTimestamp(now) }
          : prev
      );

      // Notif in-app (best effort)
      try {
        const convRaw = (await getDocument('conversations', selectedConversation.id)) as any;
        const convType = convRaw?.type || selectedConversation.type || 'client';

        // Vendor conversation: notify the vendor
        if (convType === 'vendor' && convRaw?.vendor_uid) {
          const vendorName = convRaw?.vendor_name || 'Prestataire';
          const notifBody = attachmentPreview
            ? content
              ? `Votre wedding planner vous a envoyé un message avec ${attachmentPreview.replace('📎 ', '')}`
              : `Votre wedding planner vous a envoyé ${attachmentPreview.replace('📎 ', '')}`
            : `Votre wedding planner vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''}`;
          await addDocument('notifications', {
            recipient_id: convRaw.vendor_uid,
            type: 'message',
            title: `Message de votre wedding planner`,
            message: notifBody,
            link: '/espace-pro/messages',
            read: false,
            created_at: new Date(),
            planner_id: user.uid,
            conversation_id: selectedConversation.id,
            meta: { from: 'planner', vendor_name: vendorName },
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: convRaw.vendor_uid,
              title: 'Nouveau message',
              body: notifBody,
              link: '/espace-pro/messages',
            });
          } catch (e) {
            console.warn('Unable to send push to vendor:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: convRaw.vendor_uid,
              subject: 'Nouveau message de votre wedding planner - Le Oui Parfait',
              text: `Bonjour ${vendorName},\n\nVotre wedding planner vous a envoyé un message${content ? ` :\n\n${content}` : ''}${attachmentPreview ? `\n\nAvec : ${attachmentPreview.replace('📎 ', '')}` : ''}\n\nConnectez-vous à votre espace pro pour répondre.\n\nLe Oui Parfait`,
            });
          } catch (e) {
            console.warn('Unable to send email to vendor:', e);
          }
        } else {
          // Client conversation: notify the client
          const clientId = convRaw?.client_id || selectedConversation.client_id || null;
          if (clientId) {
          const clientRaw = (await getDocument('clients', clientId)) as any;
          const clientUserId = clientRaw?.client_user_id || null;
          const clientName = `${clientRaw?.name || ''}${clientRaw?.partner ? ' & ' + clientRaw.partner : ''}`.trim() || 'Client';
          if (clientUserId) {
            const notifBody = attachmentPreview
              ? content
                ? `Votre wedding planner vous a envoyé un message avec ${attachmentPreview.replace('📎 ', '')}`
                : `Votre wedding planner vous a envoyé ${attachmentPreview.replace('📎 ', '')}`
              : `Votre wedding planner vous a envoyé un message${content ? ` : ${content.slice(0, 120)}` : ''}`;
            await addDocument('notifications', {
              recipient_id: clientUserId,
              type: 'message',
              title: 'Nouveau message',
              message: notifBody,
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
                body: notifBody,
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
                text: attachmentPreview
                  ? `Vous avez reçu un nouveau message avec ${attachmentPreview.replace('📎 ', '')}.\n\n${content ? 'Message :\n' + content + '\n\n' : ''}Connectez-vous à votre espace client pour consulter.`
                  : `Vous avez reçu un nouveau message.\n\n${content}\n\nConnectez-vous à votre espace client pour répondre.`,
              });
            } catch (e) {
              console.warn('Unable to send email:', e);
            }
          }
        }
        }
      } catch (e) {
        console.warn('Unable to create notification for message:', e);
      }

      await fetchMessages(selectedConversation.id);
    } catch (e) {
      console.error('Error sending message:', e);
      toast.error("Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!user?.uid || !convId) return;
    if (!confirm('Supprimer cette discussion de votre interface ? Les messages resteront conservés et le client continuera de voir son historique.')) return;
    try {
      await updateDocument('conversations', convId, { deleted_for_planner: true });
      if (selectedConversation?.id === convId) {
        setSelectedConversation(null);
        setShowChatOnMobile(false);
      }
      await fetchConversations();
      toast.success('Discussion masquée');
    } catch (e) {
      console.error('Error hiding conversation:', e);
      toast.error('Impossible de masquer la discussion');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return;
    if (!confirm('Supprimer ce message définitivement ?')) return;
    try {
      await deleteDocument('messages', messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success('Message supprimé');
    } catch (e) {
      console.error('Error deleting message:', e);
      toast.error('Impossible de supprimer le message');
    }
  };

  const handleAttachmentsSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingAttachments(prev => [...prev, ...Array.from(files)]);
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
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
      const now = new Date();
      const attachmentPreview = `📎 ${file.name}`;
      await updateDocument('conversations', selectedConversation.id, {
        last_message: attachmentPreview,
        last_message_at: now,
        unread_count_client: (selectedConversation.type === 'client') ? 1 : 0,
        unread_count_vendor: (selectedConversation.type === 'vendor') ? 1 : 0,
      });

      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: attachmentPreview, lastMessageAtMs: now.getTime(), time: formatSmartTimestamp(now) }
            : c
        );
        return next.sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
      });
      setSelectedConversation((prev) =>
        prev?.id === selectedConversation.id
          ? { ...prev, lastMessage: attachmentPreview, lastMessageAtMs: now.getTime(), time: formatSmartTimestamp(now) }
          : prev
      );

      // Notif in-app (best effort)
      try {
        const convRaw = (await getDocument('conversations', selectedConversation.id)) as any;
        const convType = convRaw?.type || selectedConversation.type || 'client';

        // Vendor conversation: notify the vendor
        if (convType === 'vendor' && convRaw?.vendor_uid) {
          await addDocument('notifications', {
            recipient_id: convRaw.vendor_uid,
            type: 'message',
            title: 'Nouveau message',
            message: `Votre wedding planner vous a envoyé un document : ${file.name}`,
            link: '/espace-pro/messages',
            read: false,
            created_at: new Date(),
            planner_id: user.uid,
            conversation_id: selectedConversation.id,
            meta: { from: 'planner', attachment: file.name },
          });
          await updateDocument('conversations', selectedConversation.id, {
            unread_count_vendor: 1,
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: convRaw.vendor_uid,
              title: 'Nouveau message',
              body: `Votre wedding planner vous a envoyé un document : ${file.name}`,
              link: '/espace-pro/messages',
            });
          } catch (e) {
            console.warn('Unable to send push to vendor:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: convRaw.vendor_uid,
              subject: 'Nouveau message de votre wedding planner - Le Oui Parfait',
              text: `Bonjour,\n\nVotre wedding planner vous a envoyé un document : ${file.name}.\n\nConnectez-vous à votre espace pro pour le consulter.\n\nLe Oui Parfait`,
            });
          } catch (e) {
            console.warn('Unable to send email to vendor:', e);
          }
        } else {
          // Client conversation: notify the client
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
        }
      } catch (e) {
        console.warn('Unable to create notification for attachment:', e);
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
              {loadingClients || loadingConvs ? null : (filter === 'vendor' || filter === 'team') ? (
                /* Conversations vendor/team */
                filteredProConversations.length === 0 ? (
                  <div className="text-center text-brand-gray py-10">
                    <p className="font-medium text-brand-purple">Aucune conversation</p>
                    <p className="text-sm mt-1">
                      {filter === 'vendor' ? 'Les discussions prestataires apparaîtront ici.' : 'Aucune conversation d\'équipe.'}
                    </p>
                  </div>
                ) : filteredProConversations.map((conv) => {
                  const isSelected = selectedConversation?.id === conv.id;
                  const avatarFallback = (conv.name || 'P').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
                  const typeInfo = typeConfig[conv.type] || typeConfig.client;
                  // For vendor conversations, find client name from the clients list
                  const linkedClient = conv.type === 'vendor' && conv.client_id ? clients.find((c) => c.id === conv.client_id) : null;
                  const clientContext = linkedClient?.name || (conv.type === 'vendor' ? 'Mariage' : null);
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        setShowChatOnMobile(true);
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
                            {conv.photoUrl ? <AvatarImage src={conv.photoUrl} alt={conv.name} /> : null}
                            <AvatarFallback className={`${typeInfo.color} text-white text-sm`}>
                              {avatarFallback}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-brand-purple text-sm truncate">{conv.name}</p>
                            <span className="text-xs text-brand-gray whitespace-nowrap ml-2">{conv.time}</span>
                          </div>
                          <p className="text-xs text-brand-gray">{conv.type === 'vendor' ? 'Mariage' : typeInfo.label}{clientContext ? ` · ${clientContext}` : ''}</p>
                          <p className="text-sm text-brand-gray truncate mt-1">{conv.lastMessage}</p>
                        </div>
                        {conv.unread > 0 ? (
                          <Badge className="bg-brand-turquoise text-white text-xs px-2 flex-shrink-0">{conv.unread}</Badge>
                        ) : null}
                        <button
                          title="Masquer la discussion"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteConversation(conv.id);
                          }}
                          className="p-1.5 rounded-full text-brand-gray hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Conversations client (all / client) */
                filteredClientList.length === 0 ? (
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
                        {conv ? (
                          <button
                            title="Masquer la discussion"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteConversation(conv.id);
                            }}
                            className="p-1.5 rounded-full text-brand-gray hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
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
                  <AvatarFallback className={`${selectedConversation ? (typeConfig[selectedConversation.type]?.color || 'bg-brand-turquoise') : 'bg-brand-turquoise'} text-white`}>
                    {selectedConversation?.avatar || '—'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-brand-purple">
                    {selectedConversation?.name || 'Sélectionnez une conversation'}
                  </p>
                  {selectedConversation && (
                    <p className="text-xs text-brand-gray">
                      {selectedConversation.type === 'vendor' ? 'Mariage' : (typeConfig[selectedConversation.type]?.label || 'Client')}
                      {selectedConversation.type === 'vendor' && selectedConversation.client_id ? ` · ${clients.find((c) => c.id === selectedConversation.client_id)?.name || 'Mariage'}` : ''}
                    </p>
                  )}
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

              {groupMessagesByDate(messages).map((group) => (
                <div key={group.date.toISOString()} className="space-y-4">
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-medium text-brand-gray px-3 py-1 bg-gray-50 rounded-full">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {group.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 ${message.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-8 w-8">
                      {message.isMe ? (
                        <AvatarImage src={profilePhotoUrl || '/kathy.png'} alt="Cathy" />
                      ) : null}
                      {!message.isMe && selectedConversation?.photoUrl ? (
                        <AvatarImage src={selectedConversation.photoUrl} alt={selectedConversation.name} />
                      ) : null}
                      <AvatarFallback className="bg-brand-turquoise text-white text-xs">
                        {message.isMe ? 'ME' : (selectedConversation?.avatar || 'CL')}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 relative group ${
                        message.isMe
                          ? 'bg-brand-turquoise text-white rounded-br-none'
                          : 'bg-gray-100 text-brand-purple rounded-bl-none'
                      }`}
                    >
                      {message.isMe && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Supprimer"
                          className="absolute -top-2 -right-2 p-1 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      {message.content ? (
                        <p className="text-sm whitespace-pre-wrap">
                          {linkifyText(message.content)}
                        </p>
                      ) : null}
                      {message.attachments && message.attachments.length > 0 ? (
                        (() => {
                          const imgs = message.attachments.filter((a) => isImageUrl(a.url, a.type));
                          const docs = message.attachments.filter((a) => !isImageUrl(a.url, a.type));
                          return (
                            <div className="space-y-2 mt-1">
                              {imgs.length > 0 && (
                                <div
                                  className={`grid gap-1 ${
                                    imgs.length === 1
                                      ? 'grid-cols-1'
                                      : 'grid-cols-2'
                                  }`}
                                >
                                  {imgs.map((a, idx) => (
                                    <button
                                      key={`${message.id}:img:${idx}`}
                                      type="button"
                                      onClick={() => openLightbox(a.url)}
                                      className={`relative overflow-hidden rounded-lg ${
                                        imgs.length === 1 ? 'max-w-[260px]' : ''
                                      } ${message.isMe ? 'border border-white/20' : 'border border-gray-200'}`}
                                    >
                                      <img
                                        src={a.url}
                                        alt={a.name || 'Image'}
                                        className={`w-full h-full object-cover ${
                                          imgs.length === 1 ? 'max-h-48' : 'h-32'
                                        }`}
                                        loading="lazy"
                                      />
                                      {imgs.length > 4 && idx === 3 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                                          +{imgs.length - 4}
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {docs.length > 0 && (
                                <div className="space-y-1.5">
                                  {docs.map((a, idx) => (
                                    <a
                                      key={`${message.id}:doc:${idx}`}
                                      href={a.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={a.name}
                                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                                        message.isMe
                                          ? 'bg-white/15 hover:bg-white/25 text-white'
                                          : 'bg-brand-purple/5 hover:bg-brand-purple/10 text-brand-purple'
                                      }`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        message.isMe ? 'bg-white/20' : 'bg-brand-purple/10'
                                      }`}>
                                        <FileText className="w-4 h-4 shrink-0" />
                                      </div>
                                      <span className="text-sm truncate flex-1">{a.name || 'Document'}</span>
                                      <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : null}

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 ${
                          message.isMe ? 'text-white/70' : 'text-brand-gray'
                        }`}
                      >
                        <span className="text-xs" title={formatFullTimestamp(message.created_at)}>{message.time}</span>
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
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 relative">
              <input
                id={imageInputId}
                type="file"
                accept="image/*"
                multiple
                aria-label="Joindre des images"
                className="hidden"
                onChange={(e) => {
                  handleAttachmentsSelected(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                id={documentInputId}
                type="file"
                multiple
                aria-label="Joindre des documents"
                className="hidden"
                onChange={(e) => {
                  handleAttachmentsSelected(e.target.files);
                  e.target.value = '';
                }}
              />

              {pendingAttachments.length > 0 && (
                <div className="mb-3 p-3 rounded-2xl bg-brand-purple/5 border border-brand-purple/8">
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative group flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-brand-purple/8 shadow-sm"
                      >
                        {isImageFile(file) ? (
                          <ImageIcon className="h-4 w-4 text-brand-turquoise shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-brand-purple shrink-0" />
                        )}
                        <span className="text-xs text-brand-purple max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePendingAttachment(idx)}
                          className="w-5 h-5 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAttachMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAttachMenu(false)}
                  />
                  <div className="absolute bottom-16 left-4 z-50 bg-white rounded-2xl shadow-[0_8px_30px_-6px_rgba(75,68,86,0.25)] border border-brand-purple/8 p-2 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        document.getElementById(imageInputId)?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-purple/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-turquoise/10 flex items-center justify-center shrink-0">
                        <ImageIcon className="h-4 w-4 text-brand-turquoise" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-purple">Images</p>
                        <p className="text-[11px] text-brand-gray">Photos, images multiples</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        document.getElementById(documentInputId)?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-purple/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-purple/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-brand-purple" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-purple">Documents</p>
                        <p className="text-[11px] text-brand-gray">PDF, Word, Excel...</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!selectedConversation?.id || sending || uploadingAttachment}
                  onClick={() => setShowAttachMenu(v => !v)}
                >
                  <Paperclip className="h-4 w-4 text-brand-gray" />
                </Button>
                <textarea
                  placeholder="Écrivez un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                      e.preventDefault();
                      if (newMessage.trim() || pendingAttachments.length > 0) {
                        void handleSend();
                      }
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <Button
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  disabled={(!newMessage.trim() && pendingAttachments.length === 0) || !selectedConversation?.id || sending || uploadingAttachment}
                  onClick={() => void handleSend()}
                >
                  {sending ? (
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {lightboxImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setLightboxImage(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-brand-turquoise hover:bg-brand-turquoise-hover flex items-center justify-center text-white shadow-lg transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {allLightboxImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shadow-lg transition-colors z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shadow-lg transition-colors z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium z-10">
                  {lightboxIndex + 1} / {allLightboxImages.length}
                </div>
              </>
            )}

            <img
              src={lightboxImage}
              alt="Image agrandie"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={lightboxImage}
              target="_blank"
              rel="noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-brand-purple hover:bg-brand-purple/90 text-white text-sm shadow-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </a>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
