'use client';

/**
 * Section "Modifier le mot de passe" — partagée entre les espaces
 * admin / pro / client (même logique Firebase Auth : ré-authentification
 * puis updatePassword). Une seule implémentation, pas de duplication.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ChangePasswordSectionProps {
  /** Texte de description affiché sous le titre (optionnel) */
  description?: string;
}

export function ChangePasswordSection({ description }: ChangePasswordSectionProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSaving(true);
    try {
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      if (!auth.currentUser?.email) {
        toast.error('Utilisateur non connecté');
        return;
      }

      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      toast.success('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Mot de passe actuel incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Le mot de passe est trop faible');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Session expirée : reconnectez-vous puis réessayez');
      } else {
        toast.error('Erreur lors du changement de mot de passe');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {description ? <p className="text-sm text-brand-gray">{description}</p> : null}
      <div className="space-y-2">
        <Label htmlFor="current-password">Mot de passe actuel</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
        />
      </div>
      <Button
        onClick={() => void handleChangePassword()}
        disabled={saving}
        className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Modification...
          </>
        ) : (
          'Modifier le mot de passe'
        )}
      </Button>
    </div>
  );
}
