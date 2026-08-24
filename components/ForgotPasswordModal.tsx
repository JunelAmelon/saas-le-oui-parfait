'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormStatus = 'idle' | 'sending' | 'success' | 'not_found' | 'rate_limited' | 'error';

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.status === 404) {
        setStatus('not_found');
      } else if (res.status === 429) {
        setStatus('rate_limited');
      } else if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setEmail('');
      setStatus('idle');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full rounded-none border border-brand-purple/8 p-0 overflow-hidden">
        <div className="relative h-32 bg-brand-purple">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative w-20 h-20 rounded-none ring-4 ring-white overflow-hidden bg-brand-beige shrink-0">
              <Image
                src="/kathy.png"
                alt="Cathy"
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          </div>

          {status === 'success' ? (
            <>
              <DialogHeader className="text-left mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-turquoise" />
                  <DialogTitle className="font-baskerville text-xl text-brand-purple">
                    Email envoyé !
                  </DialogTitle>
                </div>
                <DialogDescription className="text-brand-gray text-sm mt-1">
                  Un lien pour réinitialiser votre mot de passe a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception (et vos spams).
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={handleClose}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-none h-11"
              >
                Fermer
              </Button>
            </>
          ) : status === 'not_found' ? (
            <>
              <DialogHeader className="text-left mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <DialogTitle className="font-baskerville text-xl text-brand-purple">
                    Compte introuvable
                  </DialogTitle>
                </div>
                <DialogDescription className="text-brand-gray text-sm mt-1">
                  Aucun compte n&apos;existe avec l&apos;adresse <strong>{email}</strong>. Vérifiez l&apos;orthographe ou contactez votre wedding planner.
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={() => setStatus('idle')}
                variant="outline"
                className="w-full rounded-none h-11 border-brand-turquoise text-brand-turquoise-hover hover:bg-brand-turquoise/10 mb-3"
              >
                Réessayer
              </Button>
              <Button
                onClick={handleClose}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-none h-11"
              >
                Fermer
              </Button>
            </>
          ) : status === 'rate_limited' ? (
            <>
              <DialogHeader className="text-left mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <DialogTitle className="font-baskerville text-xl text-brand-purple">
                    Trop de demandes
                  </DialogTitle>
                </div>
                <DialogDescription className="text-brand-gray text-sm mt-1">
                  Pour des raisons de sécurité, les demandes de réinitialisation sont limitées. Réessayez dans une heure.
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={handleClose}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-none h-11"
              >
                Fermer
              </Button>
            </>
          ) : (
            <>
              <DialogHeader className="text-left mb-4">
                <DialogTitle className="font-baskerville text-xl text-brand-purple">
                  Mot de passe oublié ?
                </DialogTitle>
                <DialogDescription className="text-brand-gray text-sm mt-1">
                  Saisissez votre adresse email. Vous recevrez un lien pour définir un nouveau mot de passe.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    autoFocus
                    className="pl-10 h-12 border-[#E5E5E5] focus-visible:ring-brand-turquoise rounded-xl"
                  />
                </div>
                {status === 'error' && (
                  <p className="text-sm text-red-500">Une erreur est survenue. Réessayez.</p>
                )}
                <Button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-none h-11"
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
