'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { NewArticleModal } from '@/components/modals/NewArticleModal';
import { EditArticleModal } from '@/components/modals/EditArticleModal';

const articlesDemo = [
  {
    id: '1',
    name: 'Chaises Napoleon III - Dorées',
    category: 'Mobilier',
    quantity: 150,
    minQuantity: 100,
    price: 8.5,
    location: 'Entrepôt A - Allée 3',
    status: 'available',
  },
  {
    id: '2',
    name: 'Nappes blanches 3x3m',
    category: 'Linge',
    quantity: 45,
    minQuantity: 50,
    price: 12,
    location: 'Entrepôt B - Rayon 2',
    status: 'low_stock',
  },
  {
    id: '3',
    name: 'Arche florale blanche',
    category: 'Décoration',
    quantity: 8,
    minQuantity: 5,
    price: 150,
    location: 'Entrepôt A - Zone déco',
    status: 'available',
  },
  {
    id: '4',
    name: 'Lanternes LED',
    category: 'Éclairage',
    quantity: 2,
    minQuantity: 20,
    price: 15,
    location: 'Entrepôt C',
    status: 'critical',
  },
  {
    id: '5',
    name: 'Tables rondes 8 personnes',
    category: 'Mobilier',
    quantity: 35,
    minQuantity: 30,
    price: 25,
    location: 'Entrepôt A - Allée 1',
    status: 'available',
  },
];

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
  const [isNewArticleOpen, setIsNewArticleOpen] = useState(false);
  const [isEditArticleOpen, setIsEditArticleOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<typeof articlesDemo[0] | null>(null);

  const handleEdit = (article: typeof articlesDemo[0]) => {
    setSelectedArticle(article);
    setIsEditArticleOpen(true);
  };

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
              {articlesDemo.length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Disponibles</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articlesDemo.filter(a => a.status === 'available').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-orange-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Stock faible</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articlesDemo.filter(a => a.status === 'low_stock').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-red-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Stock critique</p>
            <p className="text-3xl font-bold text-brand-purple">
              {articlesDemo.filter(a => a.status === 'critical').length}
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
              />
            </div>
            <Button variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
              Filtrer
            </Button>
          </div>
        </Card>

        <Card className="p-6 shadow-xl border-0">
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
                {articlesDemo.map((article) => {
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
        </Card>
      </div>

      <NewArticleModal
        isOpen={isNewArticleOpen}
        onClose={() => setIsNewArticleOpen(false)}
      />

      <EditArticleModal
        isOpen={isEditArticleOpen}
        onClose={() => setIsEditArticleOpen(false)}
        article={selectedArticle}
      />
    </DashboardLayout>
  );
}
