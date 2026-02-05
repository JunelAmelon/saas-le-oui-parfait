import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, MapPin, Phone, Mail, Star, Package } from 'lucide-react';

const fournisseursDemo = [
  {
    id: '1',
    name: 'Mobilier Pro Bretagne',
    category: 'Mobilier',
    contactName: 'Jean Dupont',
    email: 'contact@mobilier-pro.fr',
    phone: '02 99 00 00 00',
    city: 'Rennes',
    rating: 5,
    productsCount: 45,
  },
  {
    id: '2',
    name: 'Textiles & Nappes',
    category: 'Linge',
    contactName: 'Marie Bernard',
    email: 'info@textiles-nappes.fr',
    phone: '02 99 11 11 11',
    city: 'Nantes',
    rating: 4,
    productsCount: 32,
  },
  {
    id: '3',
    name: 'Déco Événements',
    category: 'Décoration',
    contactName: 'Pierre Martin',
    email: 'contact@deco-events.fr',
    phone: '02 99 22 22 22',
    city: 'Vannes',
    rating: 5,
    productsCount: 67,
  },
  {
    id: '4',
    name: 'Lumière & Éclairage',
    category: 'Éclairage',
    contactName: 'Sophie Laurent',
    email: 'info@lumiere-eclairage.fr',
    phone: '02 99 33 33 33',
    city: 'Rennes',
    rating: 4,
    productsCount: 28,
  },
];

export default function FournisseursPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Fournisseurs
            </h1>
            <p className="text-brand-gray">
              Gérez vos fournisseurs de stock et matériel
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
            <Plus className="h-4 w-4" />
            Nouveau fournisseur
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Total fournisseurs</p>
            <p className="text-3xl font-bold text-brand-purple">
              {fournisseursDemo.length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Produits référencés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {fournisseursDemo.reduce((acc, f) => acc + f.productsCount, 0)}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-yellow-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Note moyenne</p>
            <p className="text-3xl font-bold text-brand-purple">
              {(fournisseursDemo.reduce((acc, f) => acc + f.rating, 0) / fournisseursDemo.length).toFixed(1)}/5
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Catégories</p>
            <p className="text-3xl font-bold text-brand-purple">
              {new Set(fournisseursDemo.map(f => f.category)).size}
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
              <Input
                placeholder="Rechercher un fournisseur..."
                className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              />
            </div>
            <Button variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
              Filtrer
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fournisseursDemo.map((fournisseur) => (
            <Card key={fournisseur.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-purple mb-1">
                    {fournisseur.name}
                  </h3>
                  <Badge className="bg-brand-turquoise text-white">
                    {fournisseur.category}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-brand-gray">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{fournisseur.city}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-gray">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{fournisseur.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-gray">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{fournisseur.email}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-gray">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span>{fournisseur.productsCount} produits</span>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < fournisseur.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-brand-gray">
                  ({fournisseur.rating}/5)
                </span>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-brand-gray mb-2">
                  Contact: {fournisseur.contactName}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
                >
                  Voir les détails
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
