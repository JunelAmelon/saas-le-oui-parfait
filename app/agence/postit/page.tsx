'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, GripVertical, StickyNote as StickyNoteIcon, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PostItModal } from '@/components/modals/PostItModal';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { serverTimestamp } from 'firebase/firestore';

interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
  priority: number;
}

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
  const { user } = useAuth();

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedColor, setSelectedColor] = useState<'yellow' | 'pink' | 'blue' | 'green' | 'purple'>('yellow');
  const [isPostItModalOpen, setIsPostItModalOpen] = useState(false);
  const [selectedPostIt, setSelectedPostIt] = useState<StickyNote | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [draggedNote, setDraggedNote] = useState<string | null>(null);

  // 🔄 FETCH
  const fetchPostIts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getDocuments('post_its', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);

      const mapped = data
        .map((d: any, index: number) => ({
          id: d.id,
          title: d.title || '',
          content: d.content,
          color: d.color,
          priority: d.priority ?? index + 1,
        }))
        .sort((a, b) => a.priority - b.priority);

      setNotes(mapped);
    } catch (e) {
      toast.error('Erreur lors du chargement des post-it');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostIts();
  }, [user]);

  // ➕ CREATE / ✏️ EDIT
  const handleSave = async (data: Partial<StickyNote>) => {
    if (!user) return;

    try {
      if (modalMode === 'create') {
        await addDocument('post_its', {
          ...data,
          owner_id: user.uid,
          priority: notes.length + 1,
          created_at: serverTimestamp(),
        });
        toast.success('Post-it créé');
      } else if (selectedPostIt) {
        await updateDocument('post_its', selectedPostIt.id, data);
        toast.success('Post-it modifié');
      }

      setIsPostItModalOpen(false);
      fetchPostIts();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // ❌ DELETE
  const deleteNote = async (id: string) => {
    if (!confirm('Supprimer ce post-it ?')) return;
    await deleteDocument('post_its', id);
    fetchPostIts();
    toast.success('Post-it supprimé');
  };

  // 🧲 DRAG (UI uniquement)
  const handleDragStart = (_: any, id: string) => setDraggedNote(id);
  const handleDragEnd = () => setDraggedNote(null);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">Mes Post-it</h1>
            <p className="text-sm sm:text-base text-brand-gray">Notes rapides et rappels visuels</p>
          </div>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => {
              setModalMode('create');
              setSelectedPostIt(null);
              setIsPostItModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nouveau post-it
          </Button>
        </div>

        {/* COULEURS */}
        {notes.length > 0 && (
          <Card className="p-4 shadow-xl border-0">
            <div className="flex gap-3">
              {(Object.keys(colorButtonClasses) as Array<keyof typeof colorButtonClasses>).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded border-2 ${colorButtonClasses[c]}`}
                />
              ))}
            </div>
          </Card>
        )}

        {/* EMPTY STATE */}
        {notes.length === 0 ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Card className="p-12 shadow-xl border-2 border-dashed border-brand-purple/30 bg-gradient-to-br from-white to-brand-purple/5">
              <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-turquoise/20 blur-3xl rounded-full"></div>
                  <StickyNoteIcon className="h-24 w-24 text-brand-turquoise relative" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-brand-purple">
                    Aucun post-it pour le moment
                  </h2>
                  <p className="text-brand-gray text-sm leading-relaxed">
                    Commencez à organiser vos idées et rappels en créant votre premier post-it
                  </p>
                </div>
                <Button onClick={() => setIsPostItModalOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 px-8 py-6 text-base">
                  <Plus className="h-4 w-4 mr-2" /> Créer le premier
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map(note => (
              <Card
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragEnd={handleDragEnd}
                className={`p-6 border-2 relative cursor-move ${colorClasses[note.color]} ${draggedNote === note.id ? 'opacity-50' : ''}`}
              >
                <GripVertical className="absolute top-2 left-2 h-5 w-5 text-gray-400" />
                <button onClick={() => deleteNote(note.id)} className="absolute top-2 right-2">
                  <X className="h-4 w-4" />
                </button>

                {note.title && <h3 className="font-bold mb-2">{note.title}</h3>}
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>

                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => {
                    setSelectedPostIt(note);
                    setModalMode('edit');
                    setIsPostItModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
              </Card>
            ))}

            <Card
              className={`p-6 border-2 border-dashed cursor-pointer ${colorClasses[selectedColor]} opacity-60`}
              onClick={() => setIsPostItModalOpen(true)}
            >
              <Plus className="h-12 w-12 mx-auto" />
              <p className="text-center mt-2">Ajouter un post-it</p>
            </Card>
          </div>
        )}
      </div>

      <PostItModal
        isOpen={isPostItModalOpen}
        onClose={() => setIsPostItModalOpen(false)}
        postIt={selectedPostIt}
        mode={modalMode}
        defaultColor={selectedColor}
        onSave={handleSave}
      />
    </DashboardLayout>
  );
}
