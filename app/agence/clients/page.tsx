'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Plus, Heart, MapPin, Calendar, Euro, Phone, Mail, FileText, Image as ImageIcon, X, Users, CheckCircle, Clock, Edit, MessageSquare, Eye, MoreVertical, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { ClientModal } from '@/components/modals/ClientModal';
import { toast } from 'sonner';

interface Client {
  id: string;
  names: string;
  photo?: string;
  eventDate: string;
  eventLocation: string;
  budget: number;
  guests: number;
  phone: string;
  email: string;
  status: string;
  theme?: {
    style?: string;
    description?: string;
    colors?: string[];
  };
  notes?: string;
  createdAt?: any; // Pour le tri
}

export default function ClientFilesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  // Fetch clients from Firestore
  useEffect(() => {
    async function fetchClients() {
      if (user && user.role === 'planner') {
        try {
          const clientsData = await getDocuments('clients', [
            { field: 'planner_id', operator: '==', value: user.uid }
          ]);

          // Map Firestore data to Client interface
          const mappedClients = clientsData.map((c: any) => ({
            id: c.id,
            names: `${c.name} & ${c.partner}`,
            photo: c.photo || undefined,
            eventDate: c.event_date ? new Date(c.event_date).toLocaleDateString('fr-FR') : '',
            eventLocation: c.event_location || '',
            budget: parseInt(c.budget) || 0,
            guests: parseInt(c.guests) || 0,
            phone: c.phone || '',
            email: c.email || '',
            status: c.status || 'En cours',
            theme: c.theme || undefined,
            notes: c.notes || '',
            createdAt: c.created_at || c.createdAt || new Date()
          }));

          // Trier par date de création (plus récent en premier)
          mappedClients.sort((a: Client, b: Client) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });

          setClients(mappedClients);
        } catch (error) {
          console.error('Error fetching clients:', error);
          toast.error('Erreur lors du chargement des clients');
        } finally {
          setLoading(false);
        }
      }
    }

    if (!authLoading && user?.role === 'planner') {
      fetchClients();
    }
  }, [user, authLoading]);

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (!clientId) return;
    if (loading) return;

    const found = clients.find((c) => c.id === clientId);
    if (!found) return;

    setSelectedClient(found);
    setIsDetailOpen(true);
  }, [searchParams, clients, loading]);

  const handleViewDetail = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const fetchChangeRequests = async (clientId: string) => {
    if (!user?.uid) return;
    setChangeRequestsLoading(true);
    try {
      const items = await getDocuments('change_requests', [
        { field: 'client_id', operator: '==', value: clientId },
        { field: 'planner_id', operator: '==', value: user.uid },
      ]);

      const sorted = (items as any[])
        .slice()
        .sort((a, b) => String(b?.created_at || '').localeCompare(String(a?.created_at || '')));
      setChangeRequests(sorted);
    } catch (e) {
      console.error('Error fetching change_requests:', e);
      setChangeRequests([]);
    } finally {
      setChangeRequestsLoading(false);
    }
  };

  const handleDeleteChangeRequest = async (requestId: string) => {
    if (!requestId) return;
    if (!confirm('Supprimer définitivement cette demande de modification ?')) return;
    try {
      const { deleteDocument } = await import('@/lib/db');
      await deleteDocument('change_requests', requestId);
      setChangeRequests((prev) => prev.filter((r: any) => r?.id !== requestId));
      toast.success('Demande supprimée');
    } catch (e) {
      console.error('Error deleting change_request:', e);
      toast.error('Impossible de supprimer la demande');
    }
  };

  useEffect(() => {
    if (!isDetailOpen || !selectedClient?.id) return;
    void fetchChangeRequests(selectedClient.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailOpen, selectedClient?.id, user?.uid]);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const handleGoToMessages = () => {
    if (selectedClient) {
      setIsDetailOpen(false);
      router.push(`/messages?clientId=${selectedClient.id}`);
    }
  };

  const handleGoToDocuments = () => {
    if (selectedClient) {
      setIsDetailOpen(false);
      router.push(`/documents?clientId=${selectedClient.id}`);
    }
  };

  const handleGoToPlanning = () => {
    if (selectedClient) {
      setIsDetailOpen(false);
      router.push(`/admin/clients/${selectedClient.id}/planning`);
    }
  };

  const handleGoToGallery = () => {
    if (selectedClient) {
      setIsDetailOpen(false);
      router.push(`/admin/clients/${selectedClient.id}/galerie`);
    }
  };

  const handleGoToSteps = () => {
    if (selectedClient) {
      setIsDetailOpen(false);
      router.push(`/admin/clients/${selectedClient.id}/etapes`);
    }
  };

  const handleGoToPrestataires = () => {
    if (selectedClient) {
      setIsDetailOpen(false);
      router.push(`/admin/clients/${selectedClient.id}/prestataires`);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!user) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la fiche client ${client.names} ?`)) return;

    try {
      const { deleteDocument, getDocuments } = await import('@/lib/db');

      const clientId = client.id;

      // Supprimer les données liées (best effort: on continue même si une sous-suppression échoue)
      const deleteByClientId = async (collectionName: string) => {
        try {
          const items = await getDocuments(collectionName, [
            { field: 'client_id', operator: '==', value: clientId },
          ]);
          await Promise.all((items as any[]).map((it) => deleteDocument(collectionName, it.id)));
        } catch (e) {
          console.error(`Error deleting related ${collectionName} for client:`, e);
        }
      };

      // Collections les plus importantes à nettoyer
      await Promise.all([
        deleteByClientId('documents'),
        deleteByClientId('events'),
        deleteByClientId('devis'),
        deleteByClientId('invoices'),
        deleteByClientId('gallery'),
        deleteByClientId('checklists'),
        deleteByClientId('conversations'),
      ]);

      // Contracts sont liés par client_id (et parfois par documents.contract_id déjà géré ailleurs)
      try {
        const contracts = await getDocuments('contracts', [
          { field: 'client_id', operator: '==', value: clientId },
        ]);
        await Promise.all((contracts as any[]).map((c) => deleteDocument('contracts', c.id)));
      } catch (e) {
        console.error('Error deleting contracts for client:', e);
      }

      await deleteDocument('clients', clientId);

      setClients((prev) => prev.filter((c) => c.id !== clientId));
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
        setIsDetailOpen(false);
        setIsEditOpen(false);
      }

      toast.success('Fiche client supprimée');
    } catch (e) {
      console.error('Error deleting client:', e);
      toast.error('Erreur lors de la suppression de la fiche client');
    }
  };

  // Refresh clients after modal save
  const handleClientSaved = async () => {
    if (!user) return;

    try {
      const clientsData = await getDocuments('clients', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      const mappedClients = clientsData.map((c: any) => ({
        id: c.id,
        names: `${c.name} & ${c.partner}`,
        photo: c.photo || undefined,
        eventDate: c.event_date ? new Date(c.event_date).toLocaleDateString('fr-FR') : '',
        eventLocation: c.event_location || '',
        budget: parseInt(c.budget) || 0,
        guests: parseInt(c.guests) || 0,
        phone: c.phone || '',
        email: c.email || '',
        status: c.status || 'En cours',
        theme: c.theme || undefined,
        notes: c.notes || '',
        createdAt: c.created_at || c.createdAt || new Date()
      }));

      // Trier par date de création
      mappedClients.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });

      setClients(mappedClients);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error('Error refreshing clients:', error);
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.names.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.eventLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-brand-turquoise mx-auto" />
            <p className="mt-4 text-brand-gray">Chargement des clients...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Fiches Clients
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez les dossiers complets de vos mariés
            </p>
          </div>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewClientOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle fiche client</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un client..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        {filteredClients.length === 0 ? (
          <Card className="p-12 text-center shadow-xl border-0">
            <Users className="h-16 w-16 text-brand-gray/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-purple mb-2">
              {searchQuery ? 'Aucun client trouvé' : 'Aucun client'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchQuery ? 'Essayez une autre recherche' : 'Créez votre première fiche client pour commencer'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsNewClientOpen(true)}
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une fiche client
              </Button>
            )}
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentClients.map((client) => (
                <Card key={client.id} className="p-3 shadow-xl border-0 hover:shadow-2xl transition-shadow cursor-pointer group">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div
                      className="relative h-20 w-full sm:w-20 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0"
                      onClick={() => handleViewDetail(client)}
                    >
                      {client.photo ? (
                        <img
                          src={client.photo}
                          alt={client.names}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-brand-beige to-brand-turquoise/20 flex items-center justify-center">
                          <Heart className="h-12 w-12 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <div className="flex-1 w-full">
                      <div className="mb-1 flex items-start justify-between">
                        <h3
                          className="text-lg font-bold text-brand-purple font-baskerville cursor-pointer hover:text-brand-turquoise transition-colors"
                          onClick={() => handleViewDetail(client)}
                        >
                          {client.names}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                              <MoreVertical className="h-4 w-4 text-brand-gray" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(client)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(client)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/messages')}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleDeleteClient(client)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-brand-gray mb-2">
                        {client.eventDate} | {client.eventLocation}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-[#C4A26A] hover:bg-[#B59260] text-white border-0">
                          {client.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-turquoise hover:text-brand-turquoise-hover text-xs sm:text-sm"
                          onClick={() => handleViewDetail(client)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Voir détails
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination améliorée */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-sm text-brand-gray">
                  Affichage de {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-brand-gray">...</span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => goToPage(page as number)}
                        className={`h-9 w-9 ${currentPage === page
                          ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover text-white'
                          : 'hover:bg-gray-100'
                          }`}
                      >
                        {page}
                      </Button>
                    )
                  ))}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Détail Client */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              {selectedClient?.names}
            </DialogTitle>
            <DialogDescription>
              Fiche client complète
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  {selectedClient.photo ? (
                    <img
                      src={selectedClient.photo}
                      alt={selectedClient.names}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-brand-gray" />
                  )}
                </div>
                <div>
                  <Badge className="bg-brand-turquoise text-white mb-2">
                    {selectedClient.status}
                  </Badge>
                  <p className="text-2xl font-bold text-brand-purple">
                    {selectedClient.budget.toLocaleString()} € de budget
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Date</p>
                    <p className="font-medium text-brand-purple">{selectedClient.eventDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Lieu</p>
                    <p className="font-medium text-brand-purple">{selectedClient.eventLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Invités</p>
                    <p className="font-medium text-brand-purple">{selectedClient.guests} personnes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Euro className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Budget</p>
                    <p className="font-medium text-brand-purple">{selectedClient.budget.toLocaleString()} €</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-brand-purple">Contact</h4>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-brand-turquoise" />
                  <span>{selectedClient.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-brand-turquoise" />
                  <span>{selectedClient.email}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-brand-purple">Demandes de modification (client)</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  {changeRequestsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-brand-gray">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </div>
                  ) : changeRequests.length === 0 ? (
                    <div className="text-sm text-brand-gray">Aucune demande pour le moment.</div>
                  ) : (
                    <div className="space-y-3">
                      {changeRequests.map((r: any) => (
                        <div key={r.id} className="p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-brand-purple">
                                {r.type || 'Demande'}
                              </p>
                              <p className="text-xs text-brand-gray mt-1">
                                {r.created_at || '—'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={(r.status || 'pending') === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}>
                                {r.status || 'pending'}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteChangeRequest(String(r.id))}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {r.note ? (
                            <p className="text-sm text-brand-gray mt-2 whitespace-pre-wrap">{r.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-brand-purple">Thème & Décoration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-brand-gray">Style</p>
                    <p className="font-medium text-brand-purple">{selectedClient.theme?.style || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray">Palette de couleurs</p>
                    <div className="pt-1 flex gap-2 flex-wrap">
                      {(selectedClient.theme?.colors || []).length === 0 ? (
                        <span className="text-sm text-brand-purple">—</span>
                      ) : (
                        (selectedClient.theme?.colors || []).map((c) => (
                          <span
                            key={c}
                            className="inline-block h-6 w-6 rounded-full border border-white shadow"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-brand-gray">Description</p>
                    <p className="text-sm text-brand-purple">{selectedClient.theme?.description || '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-brand-gray">Notes & Déroulement</p>
                    <p className="text-sm text-brand-purple">{selectedClient.notes || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <Button variant="outline" className="gap-2" onClick={handleGoToMessages}>
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGoToDocuments}>
                  <FileText className="h-4 w-4" />
                  Documents
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGoToPrestataires}>
                  <Users className="h-4 w-4" />
                  Prestataires
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGoToPlanning}>
                  <Calendar className="h-4 w-4" />
                  Planning
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGoToSteps}>
                  <CheckCircle className="h-4 w-4" />
                  Étapes
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGoToGallery}>
                  <ImageIcon className="h-4 w-4" />
                  Galerie
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedClient) handleEdit(selectedClient);
              }}
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Client */}
      <Dialog open={isNewClientOpen && !isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Nouvelle fiche client</DialogTitle>
            <DialogDescription>
              Créez une nouvelle fiche pour vos mariés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Partenaire 1</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
              <div>
                <Label>Partenaire 2</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" className="mt-1" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input placeholder="+33 6 00 00 00 00" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Date de l'événement</Label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <Label>Nombre d'invités</Label>
                <Input type="number" placeholder="100" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Lieu de réception</Label>
              <Input placeholder="Nom du lieu, Ville" className="mt-1" />
            </div>
            <div>
              <Label>Budget estimé (€)</Label>
              <Input type="number" placeholder="25000" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewClientOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsNewClientOpen(false)}
            >
              Créer la fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Modifier Client */}
      <Dialog open={isEditOpen && !isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Modifier la fiche</DialogTitle>
            <DialogDescription>
              {selectedClient?.names}
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Photo du couple</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                    {selectedClient.photo ? (
                      <Image
                        src={selectedClient.photo}
                        alt={selectedClient.names}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-brand-gray" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-sm"
                    />
                    <p className="text-xs text-brand-gray mt-1">
                      Format: JPG, PNG (max 5MB)
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <Label>Noms des mariés</Label>
                <Input defaultValue={selectedClient.names} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" defaultValue={selectedClient.email} className="mt-1" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input defaultValue={selectedClient.phone} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de l'événement</Label>
                  <Input defaultValue={selectedClient.eventDate} className="mt-1" />
                </div>
                <div>
                  <Label>Nombre d'invités</Label>
                  <Input type="number" defaultValue={selectedClient.guests} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Lieu de réception</Label>
                <Input defaultValue={selectedClient.eventLocation} className="mt-1" />
              </div>
              <div>
                <Label>Budget (€)</Label>
                <Input type="number" defaultValue={selectedClient.budget} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsEditOpen(false)}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ClientModal - Utilise le composant pour la vraie logique */}
      <ClientModal
        open={isNewClientOpen}
        onOpenChange={setIsNewClientOpen}
        mode="create"
        userId={user?.uid || ''}
        onSuccess={handleClientSaved}
      />

      <ClientModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        client={selectedClient || undefined}
        userId={user?.uid || ''}
        onSuccess={handleClientSaved}
      />
    </DashboardLayout>
  );
}