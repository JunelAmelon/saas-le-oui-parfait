'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-beige via-white to-brand-turquoise-light p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl border-0">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Image 
              src="/logo-horizontal.png" 
              alt="Le Oui Parfait" 
              width={200} 
              height={60}
              priority
              className="object-contain"
            />
          </div>
          <p className="text-brand-gray">
            Connectez-vous à votre espace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-purple mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-purple mb-2">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover h-12 text-base"
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

        <p className="text-center text-xs text-brand-gray mt-6">
          En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </Card>
    </div>
  );
}
