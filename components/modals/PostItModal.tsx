'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PostIt {
  id: string;
  title: string;
  content: string;
  //content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
}

interface PostItModalProps {
  isOpen: boolean;
  onClose: () => void;
  postIt?: PostIt | null;
  mode: 'create' | 'edit';
  defaultColor?: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
  onSave?: (postIt: Partial<PostIt>) => Promise<void>;
}

const colorOptions = [
  { value: 'yellow', label: 'Jaune', class: 'bg-yellow-200' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-200' },
  { value: 'blue', label: 'Bleu', class: 'bg-blue-200' },
  { value: 'green', label: 'Vert', class: 'bg-green-200' },
  { value: 'purple', label: 'Violet', class: 'bg-purple-200' },
];

export function PostItModal({ isOpen, onClose, postIt, mode, defaultColor = 'yellow', onSave }: PostItModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<'yellow' | 'pink' | 'blue' | 'green' | 'purple'>(defaultColor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && postIt) {
      setTitle(postIt.title);
      setContent(postIt.content);
      setColor(postIt.color);
    } else if (mode === 'create') {
      setTitle('');
      setContent('');
      setColor(defaultColor);
    }
  }, [mode, postIt, defaultColor, isOpen]);

  const handleSubmit = async () => {
    if (!content) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un contenu pour le post-it',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (onSave) {
        await onSave({
          title,
          content,
          color
        });
      }

      if (mode === 'create') {
        toast({
          title: 'Post-it créé',
          description: 'Votre post-it a été ajouté avec succès',
        });
      } else {
        toast({
          title: 'Post-it modifié',
          description: 'Votre post-it a été mis à jour',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-brand-turquoise" />
            {mode === 'create' ? 'Nouveau post-it' : 'Modifier le post-it'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Créez un nouveau post-it pour vos notes rapides'
              : 'Modifiez votre post-it'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Titre (optionnel)</Label>
            <Input
              placeholder="Ex: Rappel important"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Contenu *</Label>
            <Textarea
              placeholder="Votre note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>

          <div>
            <Label>Couleur</Label>
            <div className="flex gap-2 mt-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value as any)}
                  className={`w-12 h-12 rounded border-2 transition-transform ${option.class
                    } ${color === option.value ? 'scale-110 ring-2 ring-brand-purple border-brand-purple' : 'border-gray-300'}`}
                  title={option.label}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : (mode === 'create' ? 'Créer le post-it' : 'Enregistrer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
