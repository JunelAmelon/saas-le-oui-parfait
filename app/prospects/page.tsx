'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Phone, Mail, Calendar, Euro, Edit, UserPlus, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface Prospect {
  id: string;
  name: string;
  partner: string;
  email: string;
  phone: string;
  eventDate: string;
  budget: string;
  status: string;
}

const prospects: Prospect[] = [
  {
    id: '1',
    name: 'Sophie Martin',
    partner: 'Thomas Dubois',
    email: 'sophie.martin@email.fr',
    phone: '06 12 34 56 78',
    eventDate: '15/06/2025',
    budget: '30000',
    status: 'qualified',
  },
  {
    id: '2',
    name: 'Marie Laurent',
    partner: 'Pierre Durand',
    email: 'marie.laurent@email.fr',
    phone: '06 23 45 67 89',
    eventDate: '22/09/2025',
    budget: '45000',
    status: 'contacted',
  },
  {
    id: '3',
    name: 'Emma Bernard',
    partner: 'Lucas Moreau',
    email: 'emma.bernard@email.fr',
    phone: '06 34 56 78 90',
    eventDate: '10/08/2025',
    budget: '25000',
    status: 'new',
  },
];

const statusConfig = {
  new: { label: 'Nouveau', className: 'bg-blue-500' },
  contacted: { label: 'Contacté', className: 'bg-yellow-500' },
  qualified: { label: 'Qualifié', className: 'bg-green-500' },
  converted: { label: 'Converti', className: 'bg-brand-turquoise' },
  lost: { label: 'Perdu', className: 'bg-red-500' },
};

export default function ProspectsPage() {
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewProspectOpen, setIsNewProspectOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);

  const handleViewDetail = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsDetailOpen(true);
  };

  const handleConvert = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsConvertOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Prospects
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez vos prospects et suivez votre pipeline commercial
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewProspectOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau prospect</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray" />
              <Input
                placeholder="Rechercher un prospect..."
                className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              />
            </div>
            <Button
              variant="outline"
              className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </Button>
          </div>

          {/* Version mobile - Cards */}
          <div className="block sm:hidden space-y-4">
            {prospects.map((prospect) => {
              const config = statusConfig[prospect.status as keyof typeof statusConfig];
              return (
                <div key={prospect.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-brand-purple">
                        {prospect.name} & {prospect.partner}
                      </p>
                      <p className="text-sm text-brand-gray">{prospect.email}</p>
                    </div>
                    <Badge className={`${config.className} text-white border-0`}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray">{prospect.eventDate}</span>
                    <span className="font-medium text-brand-purple">
                      {parseInt(prospect.budget).toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDetail(prospect)}
                  >
                    Voir détails
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Version desktop - Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E5E5E5]">
                <tr>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Couple
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray hidden md:table-cell">
                    Contact
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Date
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Budget
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Statut
                  </th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect) => {
                  const config = statusConfig[prospect.status as keyof typeof statusConfig];
                  return (
                    <tr
                      key={prospect.id}
                      className="border-b border-[#E5E5E5] transition-colors hover:bg-gray-50"
                    >
                      <td className="py-4">
                        <p className="font-medium text-brand-purple">
                          {prospect.name} & {prospect.partner}
                        </p>
                      </td>
                      <td className="py-4 hidden md:table-cell">
                        <div className="text-sm">
                          <p className="text-brand-gray">{prospect.email}</p>
                          <p className="text-brand-gray">{prospect.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 text-brand-gray text-sm">
                        {prospect.eventDate}
                      </td>
                      <td className="py-4 font-medium text-brand-purple text-sm">
                        {parseInt(prospect.budget).toLocaleString('fr-FR')} €
                      </td>
                      <td className="py-4">
                        <Badge
                          className={`${config.className} hover:${config.className} text-white border-0 text-xs`}
                        >
                          {config.label}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetail(prospect)}
                        >
                          Voir
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

      {/* Modal Détail Prospect */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">
              {selectedProspect?.name} & {selectedProspect?.partner}
            </DialogTitle>
            <DialogDescription>
              Détails du prospect
            </DialogDescription>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge className={`${statusConfig[selectedProspect.status as keyof typeof statusConfig]?.className} text-white`}>
                  {statusConfig[selectedProspect.status as keyof typeof statusConfig]?.label}
                </Badge>
                <p className="text-xl font-bold text-brand-purple">
                  {parseInt(selectedProspect.budget).toLocaleString()} €
                </p>
              </div>

              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">{selectedProspect.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">{selectedProspect.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">Événement prévu: {selectedProspect.eventDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Euro className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">Budget: {parseInt(selectedProspect.budget).toLocaleString()} €</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Changer le statut</Label>
                <Select defaultValue={selectedProspect.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="contacted">Contacté</SelectItem>
                    <SelectItem value="qualified">Qualifié</SelectItem>
                    <SelectItem value="converted">Converti</SelectItem>
                    <SelectItem value="lost">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedProspect) handleConvert(selectedProspect);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Convertir en client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Prospect */}
      <Dialog open={isNewProspectOpen} onOpenChange={setIsNewProspectOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Nouveau prospect</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau prospect à votre pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Partenaire 1</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
              <div>
                <Label>Partenaire 2</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" className="mt-1" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input placeholder="06 00 00 00 00" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date événement prévue</Label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <Label>Budget estimé (€)</Label>
                <Input type="number" placeholder="25000" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Notes sur le prospect..." className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProspectOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsNewProspectOpen(false)}
            >
              Créer le prospect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Convertir en Client */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] sm:w-full text-center">
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-brand-purple text-xl">Convertir en client ?</DialogTitle>
            <DialogDescription className="mt-2">
              Voulez-vous convertir {selectedProspect?.name} & {selectedProspect?.partner} en client ? Une fiche client sera automatiquement créée.
            </DialogDescription>
          </div>
          <DialogFooter className="justify-center gap-2">
            <Button variant="outline" onClick={() => setIsConvertOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setIsConvertOpen(false)}
            >
              Confirmer la conversion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
