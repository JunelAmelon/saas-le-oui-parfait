'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { ChevronLeft, Loader2, Send, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Role = 'admin' | 'client';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function buildStoragePrefix(params: {
  uid: string;
  role: Role;
  clientId?: string;
}) {
  const { uid, role, clientId } = params;
  const scope = role === 'admin' ? (clientId ? `client:${clientId}` : 'global') : 'self';
  return `assistant:${role}:${uid}:${scope}`;
}

function storageKey(prefix: string, suffix: string) {
  return `${prefix}:${suffix}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractClientIdFromPathname(pathname: string): string {
  const m = pathname.match(/\/admin\/clients\/([^/]+)/i);
  if (m?.[1]) return m[1];
  return '';
}

export function AssistantWidget() {
  const pathname = usePathname() || '';
  const { user } = useAuth();

  const role: Role = user?.role === 'planner' ? 'admin' : 'client';
  const clientIdFromPath = useMemo(() => extractClientIdFromPathname(pathname), [pathname]);

  const assistantName = 'Kat';
  const introText =
    role === 'admin'
      ? "Je peux t'aider à piloter tes dossiers : factures, devis, clients, checklist, planning et suivi."
      : "Je peux t'aider à suivre l'organisation : étapes, prestataires, documents, paiements et planning.";
  const greetingText =
    role === 'admin'
      ? "Bonjour, je suis Kat, votre assistante. Comment puis-je vous aider aujourd'hui ?"
      : "Bonjour, je suis Kat, votre assistante virtuelle. Puis-je vous aider dans vos préparatifs de mariage ?";

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastSeenAssistantId, setLastSeenAssistantId] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const storagePrefix = useMemo(() => {
    if (!user?.uid) return '';
    return buildStoragePrefix({
      uid: user.uid,
      role,
      clientId: role === 'admin' ? clientIdFromPath : undefined,
    });
  }, [user?.uid, role, clientIdFromPath]);

  useEffect(() => {
    if (!storagePrefix) return;

    const persistedOpen = safeJsonParse<boolean>(localStorage.getItem(storageKey(storagePrefix, 'open')));
    const persistedMessages = safeJsonParse<ChatMessage[]>(localStorage.getItem(storageKey(storagePrefix, 'messages')));
    const persistedLastSeen = safeJsonParse<string>(
      localStorage.getItem(storageKey(storagePrefix, 'last_seen_assistant'))
    );

    setOpen(typeof persistedOpen === 'boolean' ? persistedOpen : false);
    setMessages(Array.isArray(persistedMessages) ? persistedMessages : []);
    setLastSeenAssistantId(typeof persistedLastSeen === 'string' ? persistedLastSeen : '');
  }, [storagePrefix]);

  useEffect(() => {
    if (!storagePrefix) return;
    localStorage.setItem(storageKey(storagePrefix, 'open'), JSON.stringify(open));
  }, [open, storagePrefix]);

  useEffect(() => {
    if (!storagePrefix) return;
    localStorage.setItem(storageKey(storagePrefix, 'messages'), JSON.stringify(messages.slice(-50)));
  }, [messages, storagePrefix]);

  useEffect(() => {
    if (!open) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    setLastSeenAssistantId(lastAssistant.id);
    if (!storagePrefix) return;
    localStorage.setItem(storageKey(storagePrefix, 'last_seen_assistant'), JSON.stringify(lastAssistant.id));
  }, [open, messages, storagePrefix]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  const canUseAssistant = Boolean(user?.uid);

  const hasUnreadAssistant = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return false;
    if (!lastSeenAssistantId) return true;
    return lastAssistant.id !== lastSeenAssistantId;
  }, [messages, lastSeenAssistantId]);

  const clearConversation = () => {
    const ok = window.confirm('Effacer toute la conversation ?');
    if (!ok) return;
    setMessages([]);
    setLastSeenAssistantId('');
    try {
      if (!storagePrefix) return;
      localStorage.removeItem(storageKey(storagePrefix, 'messages'));
      localStorage.removeItem(storageKey(storagePrefix, 'last_seen_assistant'));
    } catch {
      // ignore
    }
  };

  const sendQuick = async (text: string) => {
    setInput(text);
    await Promise.resolve();
    void send();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!canUseAssistant) {
      toast.error('Veuillez vous connecter pour utiliser l’assistant');
      return;
    }

    setInput('');
    const userMsg: ChatMessage = {
      id: `${Date.now()}_u`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('missing_auth');

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          role,
          pathname,
          clientId: role === 'admin' ? clientIdFromPath : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(String(json?.error || 'error'));
      }

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}_a`,
        role: 'assistant',
        content: String(json.answer || ''),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      console.error('Assistant send error:', e);

      const code = String(e?.message || 'error');
      if (code === 'openai_missing_key') {
        toast.error("Clé OpenAI manquante (OPENAI_API_KEY). Ajoute-la dans .env.local / Vercel puis redémarre.");
      } else if (code === 'openai_invalid_key') {
        toast.error('Clé OpenAI invalide. Vérifie la clé et qu’elle commence par sk-...');
      } else {
        toast.error("Impossible d'obtenir une réponse pour le moment");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canUseAssistant) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          type="button"
          className="relative h-14 w-14 rounded-full bg-transparent p-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fermer assistant' : 'Ouvrir assistant'}
        >
          <span className="absolute -inset-1 rounded-full bg-[#88b7b5]/20 blur-md" />
          <span className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-[#88b7b5] bg-white">
            <Image src="/ia.jpg" alt="Assistant" fill className="object-cover" sizes="56px" priority />
          </span>
          {!open && hasUnreadAssistant ? (
            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-[#E55D5D] text-white text-xs font-semibold flex items-center justify-center border-2 border-white">
              1
            </span>
          ) : null}
        </Button>
      </div>

      {open ? (
        <div className="fixed bottom-20 right-4 z-50 w-[94vw] max-w-[420px]">
          <Card className="overflow-hidden border border-gray-200 shadow-[0_24px_60px_rgba(0,0,0,0.22)] bg-white">
            <div className="border-b border-gray-200 bg-white">
              <div className="relative flex items-center justify-center px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1 h-9 w-9 text-gray-600 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <p className="font-semibold text-gray-900">{assistantName}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-9 w-9 text-gray-600 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="px-4 pb-3 text-center text-sm text-gray-700">
                <p>{introText}</p>
                <div className="mt-2 flex items-center justify-center gap-6 text-xs text-gray-500 underline">
                  <button type="button" className="hover:text-gray-700" onClick={() => window.open('/conditions', '_blank')}>Conditions d'utilisation</button>
                  <button type="button" className="hover:text-gray-700" onClick={() => window.open('/privacy', '_blank')}>Protection des données</button>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="max-h-[58vh] overflow-auto px-4 py-4 bg-[#F3F3F3]">
              {messages.length === 0 ? (
                <>
                  <div className="flex justify-center text-xs text-gray-400 mb-4">{new Date().toLocaleDateString('fr-FR')}</div>
                  <div className="flex items-end gap-2">
                    <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-[#88b7b5] bg-white shrink-0">
                      <Image src="/ia.jpg" alt={assistantName} width={36} height={36} className="object-cover" />
                    </div>
                    <div className="max-w-[78%] rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {greetingText}
                      </p>
                      <div className="mt-2 text-[11px] text-gray-400 text-right">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full bg-white shadow-sm border-gray-200"
                      onClick={() => void sendQuick('Oui')}
                    >
                      Oui
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full bg-white shadow-sm border-gray-200"
                      onClick={() => void sendQuick('Non, merci')}
                    >
                      Non, merci
                    </Button>
                  </div>
                </>
              ) : null}

              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    {m.role === 'assistant' ? (
                      <div className="flex items-end gap-2">
                        <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-[#88b7b5] bg-white shrink-0">
                          <Image src="/ia.jpg" alt={assistantName} width={36} height={36} className="object-cover" />
                        </div>
                        <div className="max-w-[78%] rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[78%] rounded-2xl bg-[#88b7b5] text-white shadow-sm px-4 py-3">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      </div>
                    )}
                  </div>
                ))}

                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-brand-gray">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Je prépare une réponse…
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-gray-200">
              <div className="flex gap-2 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="h-11 rounded-xl bg-white border-gray-200 focus-visible:ring-[#88b7b5]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <Button
                  type="button"
                  className="h-11 w-11 rounded-xl px-0 bg-[#FAD6D6] hover:bg-[#FAD6D6]/90 text-[#E55D5D]"
                  onClick={() => void send()}
                  disabled={loading || !input.trim()}
                  aria-label="Envoyer"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
