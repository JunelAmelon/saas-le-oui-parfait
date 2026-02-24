'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, Heart, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Role = 'admin' | 'client';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

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

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const persistedOpen = safeJsonParse<boolean>(localStorage.getItem('assistant_open'));
    const persistedMessages = safeJsonParse<ChatMessage[]>(localStorage.getItem('assistant_messages'));
    if (typeof persistedOpen === 'boolean') setOpen(persistedOpen);
    if (Array.isArray(persistedMessages)) setMessages(persistedMessages);
  }, []);

  useEffect(() => {
    localStorage.setItem('assistant_open', JSON.stringify(open));
  }, [open]);

  useEffect(() => {
    localStorage.setItem('assistant_messages', JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  const canUseAssistant = Boolean(user?.uid);

  const clearConversation = () => {
    const ok = window.confirm('Effacer toute la conversation ?');
    if (!ok) return;
    setMessages([]);
    try {
      localStorage.removeItem('assistant_messages');
    } catch {
      // ignore
    }
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
          className="relative h-12 w-12 rounded-full border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.18)] bg-[#88b7b5] hover:bg-[#6a9a98]"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fermer assistant' : 'Ouvrir assistant'}
        >
          <span className="absolute -inset-1 rounded-full bg-[#88b7b5]/35 blur-md" />
          <span className="relative">
            {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          </span>
        </Button>
      </div>

      {open ? (
        <div className="fixed bottom-20 right-4 z-50 w-[94vw] max-w-[440px]">
          <Card className="overflow-hidden border border-white/50 shadow-[0_24px_60px_rgba(0,0,0,0.22)] bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 bg-[#4B4456] text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-brand-beige border border-[#88b7b5] flex items-center justify-center shadow-inner">
                  <Bot className="h-5 w-5 text-[#4B4456]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate leading-tight">Assistant Le Oui Parfait</p>
                  <p className="text-[11px] text-white/85 truncate leading-tight">
                    {role === 'admin' ? 'Mode admin' : 'Mode client'} · Aide & suivi
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="hidden sm:flex items-center gap-1 text-white/80 mr-1">
                  <Sparkles className="h-4 w-4" />
                  <Heart className="h-4 w-4" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearConversation}
                  className="h-9 w-9 text-white hover:bg-white/15"
                  title="Effacer la conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 text-white hover:bg-white/15"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={scrollRef} className="max-h-[58vh] overflow-auto px-4 py-4 bg-brand-beige/40">
              {messages.length === 0 ? (
                <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
                  <p className="text-sm font-medium text-brand-purple">Je peux t’aider tout au long du parcours</p>
                  <p className="mt-1 text-sm text-brand-gray">
                    Exemples: “où signer le devis ?”, “résume mon budget”, “quels paiements en retard ?”
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        m.role === 'user'
                          ? 'max-w-[86%] rounded-2xl px-3 py-2.5 text-white shadow-sm bg-[#88b7b5]'
                          : 'max-w-[86%] rounded-2xl px-3 py-2.5 bg-white text-brand-gray border border-gray-100 shadow-sm'
                      }
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
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

            <div className="p-3 bg-white/90 border-t border-gray-100">
              <div className="flex gap-2 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écris ta question..."
                  className="h-11 rounded-xl bg-white border-gray-200 focus-visible:ring-brand-turquoise"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <Button
                  type="button"
                  className="h-11 rounded-xl px-4 bg-[#4B4456] hover:bg-[#4B4456]/90"
                  onClick={() => void send()}
                  disabled={loading || !input.trim()}
                >
                  <span className="hidden sm:inline">Envoyer</span>
                  <span className="sm:hidden">OK</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
