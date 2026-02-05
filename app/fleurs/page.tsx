import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Flower2, Calculator } from 'lucide-react';

const compositionsDemo = [
  {
    id: '1',
    name: 'Bouquet de mariée classique',
    flowers: ['Roses blanches (20)', 'Pivoines (10)', 'Gypsophile'],
    cost: 45,
    price: 120,
    margin: 75,
    createdFor: 'Julie & Frédérick',
  },
  {
    id: '2',
    name: 'Centre de table romantique',
    flowers: ['Roses roses (15)', 'Eucalyptus', 'Lisianthus (8)'],
    cost: 28,
    price: 75,
    margin: 47,
    createdFor: 'Sophie & Alexandre',
  },
  {
    id: '3',
    name: 'Arche florale champêtre',
    flowers: ['Roses variées (50)', 'Pivoines (30)', 'Feuillage (3kg)'],
    cost: 180,
    price: 450,
    margin: 270,
    createdFor: 'Emma & Thomas',
  },
  {
    id: '4',
    name: 'Boutonnière témoin',
    flowers: ['Rose blanche (1)', 'Gypsophile', 'Ruban'],
    cost: 5,
    price: 15,
    margin: 10,
    createdFor: 'Marie & Pierre',
  },
];

const fleursCatalog = [
  { name: 'Roses blanches', unit: 'tige', price: 2.5 },
  { name: 'Pivoines', unit: 'tige', price: 4 },
  { name: 'Lisianthus', unit: 'tige', price: 3 },
  { name: 'Gypsophile', unit: 'bouquet', price: 8 },
  { name: 'Eucalyptus', unit: 'botte', price: 12 },
  { name: 'Feuillage', unit: 'kg', price: 15 },
];

export default function FleursPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Composition Florale
            </h1>
            <p className="text-brand-gray">
              Créez et calculez vos compositions florales
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle composition
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-pink-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Compositions</p>
            <p className="text-3xl font-bold text-brand-purple">
              {compositionsDemo.length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Coût moyen</p>
            <p className="text-2xl font-bold text-brand-purple">
              {Math.round(compositionsDemo.reduce((acc, c) => acc + c.cost, 0) / compositionsDemo.length)} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Prix moyen</p>
            <p className="text-2xl font-bold text-brand-purple">
              {Math.round(compositionsDemo.reduce((acc, c) => acc + c.price, 0) / compositionsDemo.length)} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Marge totale</p>
            <p className="text-2xl font-bold text-brand-purple">
              {compositionsDemo.reduce((acc, c) => acc + c.margin, 0)} €
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4 shadow-xl border-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
                <Input
                  placeholder="Rechercher une composition..."
                  className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                />
              </div>
            </Card>

            <div className="space-y-4">
              {compositionsDemo.map((composition) => (
                <Card key={composition.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <Flower2 className="h-8 w-8 text-pink-500" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-brand-purple mb-1">
                        {composition.name}
                      </h3>
                      <p className="text-sm text-brand-gray mb-2">
                        Pour: {composition.createdFor}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {composition.flowers.map((flower, idx) => (
                          <Badge key={idx} variant="outline" className="border-pink-300 text-pink-700">
                            {flower}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Coût</p>
                      <p className="text-lg font-bold text-brand-purple">{composition.cost} €</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Prix vente</p>
                      <p className="text-lg font-bold text-brand-purple">{composition.price} €</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Marge</p>
                      <p className="text-lg font-bold text-green-600">{composition.margin} €</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
                      <Calculator className="h-3 w-3" />
                      Recalculer
                    </Button>
                    <Button size="sm" variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
                      Modifier
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4 flex items-center gap-2">
                <Flower2 className="h-5 w-5 text-pink-500" />
                Catalogue Fleurs
              </h3>
              <div className="space-y-3">
                {fleursCatalog.map((fleur, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-brand-purple text-sm">{fleur.name}</p>
                      <p className="text-xs text-brand-gray">{fleur.unit}</p>
                    </div>
                    <p className="font-bold text-brand-purple">{fleur.price} €</p>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 bg-brand-turquoise hover:bg-brand-turquoise-hover">
                Gérer le catalogue
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
