'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, getDocuments, updateDocument } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { ArrowLeft, Package, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Article = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  price: number;
  location: string;
  fournisseur_id?: string | null;
  details?: string;
  photo_url?: string | null;
};

const categories = [
  'Prestataire',
  'Animation',
  'Location',
  'Weeding',
  'Location nappage',
  'Location vaisselle',
  'Mobilier',
  'Décoration',
  'Éclairage',
  'Vaisselle',
  'Autre',
];

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const articleId = useMemo(() => {
    const id = (params as any)?.id;
    return typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  const [article, setArticle] = useState<Article | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [details, setDetails] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user || !articleId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const doc = (await getDocument('articles', articleId)) as any;
        if (!doc) throw new Error('not_found');
        if (!cancelled) {
          const mapped: Article = {
            id: doc.id || articleId,
            name: doc.name || '',
            category: doc.category || '',
            quantity: Number(doc.quantity || 0),
            min_quantity: Number(doc.min_quantity || 0),
            price: Number(doc.price || 0),
            location: doc.location || '',
            fournisseur_id: doc.fournisseur_id ?? null,
            details: doc.details || '',
            photo_url: doc.photo_url ?? null,
          };
          setArticle(mapped);

          setName(mapped.name);
          setCategory(mapped.category);
          setQuantity(String(mapped.quantity));
          setMinQuantity(String(mapped.min_quantity));
          setPrice(String(mapped.price));
          setLocation(mapped.location);
          setSupplierId(mapped.fournisseur_id || '');
          setDetails(mapped.details || '');
          setPhotoUrl(mapped.photo_url || null);
          setPhotoFile(null);
        }
      } catch (e) {
        console.error('Error loading article:', e);
        toast.error("Impossible de charger l'article");
        router.push('/stock/articles');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, articleId, router]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const [wh, sup] = await Promise.all([
          getDocuments('warehouses', [{ field: 'owner_id', operator: '==', value: user.uid }]),
          getDocuments('fournisseurs', [{ field: 'owner_id', operator: '==', value: user.uid }]),
        ]);

        if (!cancelled) {
          const mappedWh = (wh as any[])
            .map((w) => ({ id: w.id, name: w.name || '' }))
            .filter((w) => Boolean(w.name));
          const mappedSup = (sup as any[])
            .map((s) => ({ id: s.id, name: s.name || '' }))
            .filter((s) => Boolean(s.name));

          setWarehouses(mappedWh);
          setSuppliers(mappedSup);
        }
      } catch (e) {
        console.error('Error loading metadata:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async () => {
    if (!user || !articleId) return;
    if (!name || !category || !quantity || !minQuantity || !price || !location) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      let nextPhotoUrl = photoUrl;
      if (photoFile) {
        toast.info('Upload de la photo en cours...');
        nextPhotoUrl = await uploadImage(photoFile, 'articles');
      }

      await updateDocument('articles', articleId, {
        name,
        category,
        quantity: parseInt(quantity),
        min_quantity: parseInt(minQuantity),
        price: parseFloat(price),
        location,
        details,
        photo_url: nextPhotoUrl,
        fournisseur_id: supplierId || null,
        updated_at: new Date(),
      });

      setPhotoUrl(nextPhotoUrl || null);
      setPhotoFile(null);
      toast.success('Article mis à jour');
    } catch (e) {
      console.error('Error saving article:', e);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="outline" className="gap-2 w-full sm:w-auto">
              <Link href="/stock/articles">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple">
                {loading ? 'Article' : name || 'Article'}
              </h1>
              <p className="text-sm text-brand-gray">Détails et gestion de votre article de stock</p>
            </div>
          </div>

          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-brand-gray uppercase tracking-label">Aperçu</p>
                <p className="text-lg font-semibold text-brand-purple mt-1">Photo</p>
              </div>
              <Package className="h-5 w-5 text-brand-turquoise" />
            </div>

            <div className="mt-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="w-full aspect-square object-cover rounded-xl border border-gray-200"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-brand-gray">
                  Aucune photo
                </div>
              )}
            </div>

            <div className="mt-4">
              <Label>Changer la photo</Label>
              <input
                id="article-photo-upload-detail"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setPhotoFile(f);
                }}
              />
              <label
                htmlFor="article-photo-upload-detail"
                className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-brand-gray hover:border-brand-turquoise hover:text-brand-purple transition-colors cursor-pointer bg-white"
              >
                <Package className="h-4 w-4" />
                {photoFile ? 'Photo sélectionnée' : 'Ajouter / changer la photo'}
              </label>
              {photoFile ? (
                <p className="text-xs text-brand-gray mt-2">{photoFile.name}</p>
              ) : null}
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-brand-gray uppercase tracking-label">Informations</p>
                <p className="text-lg font-semibold text-brand-purple mt-1">Fiche article</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nom de l'article *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Catégorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prix unitaire (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Quantité *</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Quantité minimale *</Label>
                <Input
                  type="number"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Emplacement *</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fournisseur (optionnel)</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Détails du produit (optionnel)</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="mt-1"
                  rows={6}
                  placeholder="Décrivez le produit (dimensions, matière, couleur, conditionnement, etc.)"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
