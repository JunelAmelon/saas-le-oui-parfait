'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setDocument } from '@/lib/db';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore
      await setDocument('profiles', user.uid, {
        email: email,
        full_name: fullName,
        role: 'planner', // Default role. You might want to change this or add a selection in the UI.
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Compte créé',
        description: 'Vous pouvez maintenant vous connecter',
      });

      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
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
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-12 w-12 text-brand-turquoise fill-brand-turquoise" />
          </div>
          <h1 className="text-3xl font-bold text-brand-purple mb-2">
            Le Oui Parfait
          </h1>
          <p className="text-brand-gray">
            Créer votre compte wedding planner
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-brand-purple mb-2">
              Nom complet
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sophie Martin"
              required
              className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>

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
              minLength={8}
              className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
            <p className="text-xs text-brand-gray mt-1">
              Minimum 8 caractères
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover h-12 text-base"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer mon compte'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-gray">
            Vous avez déjà un compte ?{' '}
            <a
              href="/login"
              className="text-brand-turquoise hover:text-brand-turquoise-hover font-medium"
            >
              Se connecter
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-brand-gray mt-6">
          En créant un compte, vous acceptez nos conditions et notre politique de confidentialité.
        </p>
      </Card>
    </div>
  );
}
