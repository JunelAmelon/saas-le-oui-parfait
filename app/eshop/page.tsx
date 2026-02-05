import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, ShoppingBag, Package, TrendingUp, Euro } from 'lucide-react';

const produitsDemo = [
  {
    id: '1',
    name: 'Kit décoration table',
    category: 'Décoration',
    price: 45,
    stock: 12,
    sales: 8,
    revenue: 360,
    image: null,
    type: 'sale',
  },
  {
    id: '2',
    name: 'Arche florale',
    category: 'Location',
    price: 150,
    stock: 3,
    sales: 5,
    revenue: 750,
    image: null,
    type: 'rental',
  },
  {
    id: '3',
    name: 'Livre d\'or personnalisé',
    category: 'Papeterie',
    price: 35,
    stock: 20,
    sales: 12,
    revenue: 420,
    image: null,
    type: 'sale',
  },
  {
    id: '4',
    name: 'Guirlande LED 20m',
    category: 'Éclairage',
    price: 80,
    stock: 6,
    sales: 4,
    revenue: 320,
    image: null,
    type: 'rental',
  },
];

const commandesDemo = [
  {
    id: '1',
    reference: 'CMD-2024-001',
    client: 'Julie Martin',
    date: '05/02/2024',
    items: 3,
    total: 230,
    status: 'completed',
  },
  {
    id: '2',
    reference: 'CMD-2024-002',
    client: 'Sophie Dubois',
    date: '04/02/2024',
    items: 2,
    total: 185,
    status: 'pending',
  },
  {
    id: '3',
    reference: 'CMD-2024-003',
    client: 'Emma Bernard',
    date: '03/02/2024',
    items: 5,
    total: 415,
    status: 'shipped',
  },
];

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  shipped: { label: 'Expédiée', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
};

export default function EshopPage() {
  const totalRevenue = produitsDemo.reduce((acc, p) => acc + p.revenue, 0);
  const totalSales = produitsDemo.reduce((acc, p) => acc + p.sales, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              E-shop
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez votre boutique en ligne
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau produit</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="h-8 w-8 text-brand-turquoise" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">{produitsDemo.length}</p>
            <p className="text-sm text-brand-gray">Produits</p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">{commandesDemo.length}</p>
            <p className="text-sm text-brand-gray">Commandes</p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">{totalSales}</p>
            <p className="text-sm text-brand-gray">Ventes</p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Euro className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-brand-purple mb-1">{totalRevenue} €</p>
            <p className="text-sm text-brand-gray">CA total</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-purple">Produits</h3>
              <Button size="sm" variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
                <Search className="h-3 w-3 mr-2" />
                Rechercher
              </Button>
            </div>

            <div className="space-y-3">
              {produitsDemo.map((produit) => (
                <div key={produit.id} className="p-4 rounded-lg border border-[#E5E5E5] hover:border-brand-turquoise transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-brand-purple mb-1">{produit.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-brand-gray">
                        <Badge variant="outline" className="border-brand-turquoise text-brand-turquoise text-xs">
                          {produit.category}
                        </Badge>
                        <Badge className={produit.type === 'sale' ? 'bg-blue-500' : 'bg-purple-500'}>
                          {produit.type === 'sale' ? 'Vente' : 'Location'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-brand-purple">{produit.price} €</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-brand-gray">Stock</p>
                      <p className="font-bold text-brand-purple">{produit.stock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray">Vendus</p>
                      <p className="font-bold text-brand-purple">{produit.sales}</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray">CA</p>
                      <p className="font-bold text-green-600">{produit.revenue} €</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-purple">Commandes récentes</h3>
              <Button size="sm" variant="ghost" className="text-brand-turquoise">
                Voir tout
              </Button>
            </div>

            <div className="space-y-3">
              {commandesDemo.map((commande) => {
                const config = statusConfig[commande.status as keyof typeof statusConfig];
                return (
                  <div key={commande.id} className="p-4 rounded-lg border border-[#E5E5E5] hover:border-brand-turquoise transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-brand-purple mb-1">{commande.reference}</p>
                        <p className="text-sm text-brand-gray">{commande.client}</p>
                        <p className="text-xs text-brand-gray">{commande.date}</p>
                      </div>
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5]">
                      <p className="text-sm text-brand-gray">{commande.items} articles</p>
                      <p className="text-lg font-bold text-brand-purple">{commande.total} €</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
