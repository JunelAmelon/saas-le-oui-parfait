'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { NewArticleModal } from '@/components/modals/NewArticleModal';
import { EditArticleModal } from '@/components/modals/EditArticleModal';

interface Article {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  price: number;
  location: string;
  status: string;
  fournisseur_id?: string | null;
}

const statusConfig = {
  available: {
    label: 'Disponible',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  low_stock: {
    label: 'Stock faible',
    color: 'bg-orange-100 text-orange-700',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Stock critique',
    color: 'bg-red-100 text-red-700',
    icon: AlertTriangle,
  },
};

export default function ArticlesPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewArticleOpen, setIsNewArticleOpen] = useState(false);
  const [isEditArticleOpen, setIsEditArticleOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Fetch articles
  const fetchArticles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('articles', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => {
        const quantity = d.quantity || 0;
        const minQuantity = d.min_quantity || 0;
        let status = 'available';
        if (quantity === 0) status = 'critical';
        else if (quantity < minQuantity) status = 'low_stock';
        
        return {
          id: d.id,
          name: d.name,
          category: d.category,
          quantity: quantity,
          minQuantity: minQuantity,
          price: d.price || 0,
          location: d.location || '',
          status: status,
          fournisseur_id: d.fournisseur_id ?? null,
        };
      });
      setArticles(mapped);
    } catch (e) {
      console.error('Error fetching articles:', e);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [user]);

  const handleEdit = (article: Article) => {
    setSelectedArticle(article);
    setIsEditArticleOpen(true);
  };

  const filteredArticles = articles.filter(article =>
    article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">
              Articles de stock
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez votre inventaire de matériel
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewArticleOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Total articles</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articles.length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Disponibles</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articles.filter(a => a.status === 'available').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-orange-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Stock faible</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articles.filter(a => a.status === 'low_stock').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-red-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Stock critique</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articles.filter(a => a.status === 'critical').length}
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
              <Input
                placeholder="Rechercher un article..."
                className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
              Filtrer
            </Button>
          </div>
        </Card>

        <Card className="p-6 shadow-xl border-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 text-brand-gray mx-auto mb-4" />
              <h3 className="text-xl font-bold text-brand-purple mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun article'}
              </h3>
              <p className="text-brand-gray mb-6">
                {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Ajoutez votre premier article'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsNewArticleOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                  <Plus className="h-4 w-4 mr-2" /> Ajouter un article
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#E5E5E5]">
                  <tr>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                      Article
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                      Catégorie
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                      Stock
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                      Prix unitaire
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                      Emplacement
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                      Statut
                    </th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => {
                  const config = statusConfig[article.status as keyof typeof statusConfig];
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={article.id}
                      className="border-b border-[#E5E5E5] transition-colors hover:bg-gray-50"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-brand-turquoise" />
                          <p className="font-medium text-brand-purple">
                            {article.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 text-brand-gray">
                        {article.category}
                      </td>
                      <td className="py-4">
                        <div className="text-sm">
                          <p className="font-bold text-brand-purple">{article.quantity}</p>
                          <p className="text-xs text-brand-gray">Min: {article.minQuantity}</p>
                        </div>
                      </td>
                      <td className="py-4 font-medium text-brand-purple">
                        {article.price.toFixed(2)} €
                      </td>
                      <td className="py-4 text-sm text-brand-gray">
                        {article.location}
                      </td>
                      <td className="py-4">
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(article)}
                        >
                          Modifier
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <NewArticleModal
        isOpen={isNewArticleOpen}
        onClose={() => setIsNewArticleOpen(false)}
        onArticleCreated={fetchArticles}
      />

      <EditArticleModal
        isOpen={isEditArticleOpen}
        onClose={() => setIsEditArticleOpen(false)}
        article={selectedArticle}
        onArticleUpdated={fetchArticles}
      />
    </DashboardLayout>
  );
}
