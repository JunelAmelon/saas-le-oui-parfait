'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, Eye, EyeOff, Infinity as InfinityIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/');
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur Le Oui Parfait',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: 'Veuillez réessayer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${playfair.variable} min-h-screen flex flex-col lg:flex-row bg-white`}>
      {/* ---------- PANNEAU IMAGE ---------- */}
      <div className="relative w-full h-64 sm:h-80 lg:h-auto lg:w-[46%] shrink-0 overflow-hidden">
        <div className="absolute inset-0 lg:rounded-br-[120px] overflow-hidden">
          <Image
            src="couple-mariage.jpg" // 👉 remplace par ton visuel (portrait, format 4:5 ou plus haut que large de préférence)
            alt="Jeunes mariés"
            fill
            priority
            className="object-cover"
          />
          {/* voile dégradé pour la lisibilité + ambiance */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-turquoise/20 via-transparent to-transparent" />
        </div>

        {/* citation flottante sur la photo */}
        <div className="absolute inset-0 flex items-center justify-center p-6 lg:p-10">
          <p
            className="text-white/95 text-center text-2xl sm:text-3xl lg:text-4xl leading-snug drop-shadow-sm max-w-md font-playfair"
          >
            « Le plus beau jour<br className="hidden sm:block" /> commence ici. »
          </p>
        </div>

        {/* halo décoratif discret */}
        <div className="hidden lg:block absolute -top-10 -left-10 w-56 h-56 rounded-full bg-brand-turquoise-light/40 blur-3xl" />
      </div>

      {/* ---------- SCEAU MONOGRAMME (chevauche la couture) ---------- */}
      <div
        className="relative z-20 lg:absolute lg:top-1/2 lg:left-[46%] lg:-translate-x-1/2 lg:-translate-y-1/2
                   -mt-8 lg:mt-0 flex justify-center lg:block"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-xl border border-[#C9A961]/40 flex items-center justify-center">
          <div className="w-[85%] h-[85%] rounded-full border border-[#C9A961] flex items-center justify-center bg-gradient-to-br from-brand-beige to-white">
            <InfinityIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[#C9A961]" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* ---------- PANNEAU FORMULAIRE ---------- */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 bg-gradient-to-b from-white to-brand-beige/30">
        {/* halos décoratifs subtils */}
        <div className="hidden lg:block absolute top-16 right-10 w-40 h-40 rounded-full bg-brand-turquoise-light/30 blur-3xl pointer-events-none" />
        <div className="hidden lg:block absolute bottom-10 right-24 w-24 h-24 rounded-full bg-[#C9A961]/10 blur-2xl pointer-events-none" />

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
            <h1
              className="text-2xl sm:text-3xl text-brand-purple mb-2 font-playfair"
            >
              Bienvenue
            </h1>
            <p className="text-brand-gray text-sm">
              Connectez-vous à votre espace mariage
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-purple mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="pl-10 h-12 border-[#E5E5E5] focus-visible:ring-brand-turquoise rounded-xl"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-brand-purple">
                  Mot de passe
                </label>
<button
  type="button" onClick={() => setForgotOpen(true)}
  className="text-xs text-brand-turquoise hover:text-brand-turquoise-hover transition-colors"
>
                  Oublié ?
                </button>
              </div>
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

            <Button
              type="submit"
              className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover h-12 text-base rounded-xl shadow-lg shadow-brand-turquoise/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-brand-gray mt-6 leading-relaxed">
            En vous connectant, vous acceptez nos{' '}
            <a href="/cgu" className="underline hover:text-brand-purple">conditions d&apos;utilisation</a>{' '}
            et notre{' '}
            <a href="/confidentialite" className="underline hover:text-brand-purple">politique de confidentialité</a>.
          </p>
        </div>
      </div>
      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}