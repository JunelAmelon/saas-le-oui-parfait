'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
}

const notesDemo: StickyNote[] = [
  {
    id: '1',
    title: 'Rappel important',
    content: 'Confirmer la livraison des fleurs pour le 23/08',
    color: 'yellow',
  },
  {
    id: '2',
    title: 'À ne pas oublier',
    content: 'Envoyer le planning détaillé aux prestataires',
    color: 'pink',
  },
  {
    id: '3',
    title: 'Idée déco',
    content: 'Proposer des lanternes suspendues pour le cocktail',
    color: 'blue',
  },
  {
    id: '4',
    title: 'Contact traiteur',
    content: 'Tel: 02 99 XX XX XX\nDemander option végétarienne',
    color: 'green',
  },
  {
    id: '5',
    title: 'Budget',
    content: 'Revoir les devis fleuriste\nNégocier tarif groupe photographe',
    color: 'purple',
  },
  {
    id: '6',
    title: 'Timeline jour J',
    content: '14h - Cérémonie\n16h - Cocktail\n19h30 - Dîner',
    color: 'yellow',
  },
];

const colorClasses = {
  yellow: 'bg-yellow-100 border-yellow-300 shadow-yellow-200',
  pink: 'bg-pink-100 border-pink-300 shadow-pink-200',
  blue: 'bg-blue-100 border-blue-300 shadow-blue-200',
  green: 'bg-green-100 border-green-300 shadow-green-200',
  purple: 'bg-purple-100 border-purple-300 shadow-purple-200',
};

const colorButtonClasses = {
  yellow: 'bg-yellow-200 hover:bg-yellow-300 border-yellow-400',
  pink: 'bg-pink-200 hover:bg-pink-300 border-pink-400',
  blue: 'bg-blue-200 hover:bg-blue-300 border-blue-400',
  green: 'bg-green-200 hover:bg-green-300 border-green-400',
  purple: 'bg-purple-200 hover:bg-purple-300 border-purple-400',
};

export default function PostItPage() {
  const [notes, setNotes] = useState(notesDemo);
  const [selectedColor, setSelectedColor] = useState<'yellow' | 'pink' | 'blue' | 'green' | 'purple'>('yellow');

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Mes Post-it
            </h1>
            <p className="text-brand-gray">
              Notes rapides et rappels visuels
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
            <Plus className="h-4 w-4" />
            Nouveau post-it
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-brand-gray">Couleur:</span>
            {(['yellow', 'pink', 'blue', 'green', 'purple'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded border-2 transition-transform ${
                  colorButtonClasses[color]
                } ${selectedColor === color ? 'scale-110 ring-2 ring-brand-purple' : ''}`}
                aria-label={color}
              />
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={`p-6 border-2 shadow-lg hover:shadow-xl transition-all cursor-move relative ${colorClasses[note.color]}`}
            >
              <button
                onClick={() => deleteNote(note.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>

              <div className="space-y-3">
                {note.title && (
                  <h3 className="font-bold text-brand-purple pr-6">
                    {note.title}
                  </h3>
                )}
                <p className="text-sm text-brand-gray whitespace-pre-wrap font-sans leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-current/20">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs hover:bg-black/5"
                >
                  Modifier
                </Button>
              </div>
            </Card>
          ))}

          <Card
            className={`p-6 border-2 border-dashed shadow-lg hover:shadow-xl transition-all cursor-pointer ${colorClasses[selectedColor]} opacity-50 hover:opacity-100`}
          >
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
              <Plus className="h-12 w-12 text-brand-purple" />
              <p className="font-medium text-brand-purple">
                Ajouter un post-it
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
