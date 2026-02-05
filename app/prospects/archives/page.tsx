import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Archive, RefreshCcw, Trash2 } from 'lucide-react';

const archivedProspects = [
  {
    id: '1',
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@email.com',
    eventDate: '15/05/2023',
    status: 'lost',
    reason: 'Budget insuffisant',
    archivedDate: '20/12/2023',
  },
  {
    id: '2',
    firstName: 'Pierre',
    lastName: 'Martin',
    email: 'pierre.martin@email.com',
    eventDate: '10/08/2023',
    status: 'converted',
    reason: 'Converti en client',
    archivedDate: '15/01/2024',
  },
  {
    id: '3',
    firstName: 'Camille',
    lastName: 'Laurent',
    email: 'camille.laurent@email.com',
    eventDate: '25/06/2023',
    status: 'lost',
    reason: 'Aucune réponse',
    archivedDate: '10/11/2023',
  },
];

const statusConfig = {
  lost: {
    label: 'Perdu',
    color: 'bg-red-100 text-red-700',
  },
  converted: {
    label: 'Converti',
    color: 'bg-green-100 text-green-700',
  },
};

export default function ProspectsArchivesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Archives Prospects
            </h1>
            <p className="text-brand-gray">
              Consultez vos anciens prospects
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 px-4 py-2 text-base">
            <Archive className="h-4 w-4 mr-2" />
            {archivedProspects.length} prospects archivés
          </Badge>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher dans les archives..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>
        </Card>

        <div className="space-y-4">
          {archivedProspects.map((prospect) => (
            <Card key={prospect.id} className="p-6 shadow-xl border-0 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-brand-purple">
                      {prospect.firstName} {prospect.lastName}
                    </h3>
                    <Badge className={statusConfig[prospect.status as keyof typeof statusConfig].color}>
                      {statusConfig[prospect.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-brand-gray">
                    <div>
                      <span className="font-medium">Email:</span> {prospect.email}
                    </div>
                    <div>
                      <span className="font-medium">Date événement:</span> {prospect.eventDate}
                    </div>
                    <div>
                      <span className="font-medium">Motif:</span> {prospect.reason}
                    </div>
                    <div>
                      <span className="font-medium">Archivé le:</span> {prospect.archivedDate}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Restaurer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
