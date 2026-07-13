'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validatePassword } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Mail, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
});

type Status = 'checking' | 'ready' | 'invalid' | 'success' | 'submitting';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';

  const [status, setStatus] = useState<Status>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!oobCode) {
      setStatus('invalid');
      setError('Ce lien est invalide ou incomplet.');
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((resolvedEmail) => {
        setEmail(resolvedEmail);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('invalid');
        setError('Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.');
      });
  }, [oobCode]);

  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => router.push('/login'), 1800);
    return () => clearTimeout(t);
  }, [status, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendStatus('sending');
    try {
      await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
    } catch {
      // silencieux : on affiche toujours la confirmation ci-dessous
    } finally {
      setResendStatus('sent');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const check = validatePassword(password);
    if (!check.valid) {
      setError(check.error || 'Mot de passe invalide');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setStatus('submitting');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err: any) {
      if (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code') {
        setResendEmail(email);
        setError('Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.');
        setStatus('invalid');
      } else if (err?.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        setStatus('ready');
      } else {
        setError("Impossible de définir le mot de passe. Réessayez.");
        setStatus('ready');
      }
    }
  };

  return (
    <div className={`${playfair.variable} min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-beige/30 px-6 py-10`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo-horizontal.png"
              alt="Le Oui Parfait"
              width={190}
              height={56}
              priority
              className="object-contain"
            />
          </div>

          {status === 'checking' && (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-brand-turquoise mx-auto mb-4" />
              <p className="text-brand-gray text-sm">Vérification du lien...</p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <XCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl text-brand-purple mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                Lien invalide
              </h1>
              <p className="text-brand-gray text-sm mb-6">{error}</p>

              {resendStatus === 'sent' ? (
                <p className="text-sm text-brand-turquoise-hover bg-brand-turquoise/10 rounded-xl px-4 py-3 mb-6">
                  Si un compte existe avec cette adresse, un nouveau lien vient d&apos;être envoyé.
                </p>
              ) : (
                <form onSubmit={handleResend} className="text-left mb-6">
                  <label htmlFor="resendEmail" className="block text-sm font-medium text-brand-purple mb-2">
                    Recevoir un nouveau lien
                  </label>
                  <div className="relative mb-3">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                    <Input
                      id="resendEmail"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      className="pl-10 h-12 border-[#E5E5E5] focus-visible:ring-brand-turquoise rounded-xl"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={resendStatus === 'sending'}
                    className="w-full h-12 rounded-xl border-brand-turquoise text-brand-turquoise-hover hover:bg-brand-turquoise/10"
                  >
                    {resendStatus === 'sending' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      'Recevoir un nouveau lien'
                    )}
                  </Button>
                </form>
              )}

              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover h-12 text-base rounded-xl"
              >
                Retour à la connexion
              </Button>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-brand-turquoise mx-auto mb-4" />
              <h1 className="text-2xl text-brand-purple mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                Mot de passe défini
              </h1>
              <p className="text-brand-gray text-sm mb-6">
                Redirection vers la connexion...
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover h-12 text-base rounded-xl"
              >
                Se connecter maintenant
              </Button>
            </>
          )}

          {(status === 'ready' || status === 'submitting') && (
            <>
              <h1 className="text-2xl sm:text-3xl text-brand-purple mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                Définir mon mot de passe
              </h1>
              <p className="text-brand-gray text-sm mb-6">{email}</p>

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-brand-purple mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-10 pr-10 h-12 border-[#E5E5E5] focus-visible:ring-brand-turquoise rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-purple transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-purple mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-10 h-12 border-[#E5E5E5] focus-visible:ring-brand-turquoise rounded-xl"
                    />
                  </div>
                </div>

                {error ? <p className="text-sm text-red-500">{error}</p> : null}

                <Button
                  type="submit"
                  className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover h-12 text-base rounded-xl shadow-lg shadow-brand-turquoise/20 transition-all"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Définir mon mot de passe'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
