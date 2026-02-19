'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Plus, FileText, Download, Eye, Edit, CheckCircle, Clock, XCircle, Loader2, Send, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ContractModal } from '@/components/modals/ContractModal';
import { NewContractModal } from '@/components/modals/NewContractModal';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { useRef } from 'react';

interface Contract {
  id: string;
  reference: string;
  title: string;
  client: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  signedAt: string | null;
  pdfUrl?: string;
  contractContent?: string;
  docusign?: any;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: Edit,
    color: 'bg-gray-100 text-gray-700',
    iconColor: 'text-gray-500',
  },
  sent: {
    label: 'Envoyé',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-500',
  },
  signed: {
    label: 'Signé',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700',
    iconColor: 'text-green-500',
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
    iconColor: 'text-red-500',
  },
};

const typeLabels = {
  service_contract: 'Contrat de service',
  venue_contract: 'Contrat lieu',
  vendor_contract: 'Contrat prestataire',
};

export default function ContractsPage() {
  const { user } = useAuth();
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const contractsPerPage = 3;

  const syncedEnvelopeIdsRef = useRef<Set<string>>(new Set());

  // Fetch contracts from Firebase
  const fetchContracts = async () => {
    if (!user) {
      console.log('No user, skipping fetch');
      setLoading(false);
      return;
    }
    
    console.log('🔄 Fetching contracts for user:', user.uid);
    setLoading(true);
    try {
      const data = await getDocuments('contracts', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      console.log('✅ Contracts fetched from Firebase:', data.length, 'contrats');
      console.log('📄 Raw data:', data);
      
      const mapped = data.map((c: any) => {
        try {
          return {
            id: c.id || '',
            reference: c.reference || 'N/A',
            title: c.title || 'Contrat sans titre',
            client: c.client || 'Client inconnu',
            type: c.type || 'service_contract',
            amount: typeof c.amount === 'number' ? c.amount : 0,
            status: c.status || 'draft',
            createdAt: c.created_at || c.created_timestamp?.toDate?.()?.toLocaleDateString('fr-FR') || '',
            signedAt: c.signed_at || null,
            pdfUrl: c.pdf_url || '',
            contractContent: c.contract_content || '',
            docusign: c.docusign || null,
            _createdTimestamp: c.created_timestamp || null,
          };
        } catch (err) {
          console.error('❌ Error mapping contract:', c.id, err);
          return null;
        }
      }).filter((c: any) => c !== null) as Contract[];
      
      // Trier par date de création (plus récent en premier)
      mapped.sort((a: any, b: any) => {
        const dateA = a._createdTimestamp?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b._createdTimestamp?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Mapped and sorted contracts:', mapped.length, 'contrats');
      console.log('📋 Contracts list:', mapped);
      setContracts(mapped);

      // Fallback: sync DocuSign statuses + signed PDF without relying on Connect webhook
      try {
        const idToken = await auth.currentUser?.getIdToken().catch(() => null);
        if (!idToken) return;

        const toSync = mapped
          .map((c) => ({
            id: c.id,
            envelopeId: String(c?.docusign?.envelope_id || '').trim(),
            status: String(c?.docusign?.status || c.status || '').trim().toLowerCase(),
          }))
          .filter((x) => x.envelopeId && x.status !== 'completed')
          .filter((x) => !syncedEnvelopeIdsRef.current.has(x.envelopeId));

        if (toSync.length === 0) return;

        // Mark as synced early to avoid request loops
        toSync.forEach((x) => syncedEnvelopeIdsRef.current.add(x.envelopeId));

        await Promise.allSettled(
          toSync.slice(0, 5).map((x) =>
            fetch('/api/docusign/sync-envelope', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ docType: 'contract', docId: x.id }),
            })
          )
        );

        // Refresh once to reflect updated statuses / pdf_url
        setTimeout(() => {
          fetchContracts();
        }, 800);
      } catch (e) {
        console.warn('DocuSign sync fallback failed (admin contracts):', e);
      }
    } catch (e) {
      console.error('Error fetching contracts:', e);
      toast.error('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const filteredContracts = contracts.filter(contract =>
    contract.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredContracts.length / contractsPerPage);
  const startIndex = (currentPage - 1) * contractsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, startIndex + contractsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewContract = (contract: Contract) => {
    if (contract.pdfUrl) {
      window.open(contract.pdfUrl, '_blank');
      toast.success('Ouverture du PDF');
    } else if (contract.contractContent) {
      setSelectedContract(contract);
      setIsViewModalOpen(true);
    } else {
      toast.error('Aucun contenu disponible');
    }
  };

  const handleDownloadContract = (contract: Contract) => {
    if (contract.pdfUrl) {
      // Créer un lien de téléchargement
      fetch(contract.pdfUrl)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${contract.reference}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success('PDF téléchargé');
        })
        .catch(() => {
          // Fallback: ouvrir dans un nouvel onglet
          window.open(contract.pdfUrl, '_blank');
          toast.info('PDF ouvert dans un nouvel onglet');
        });
    } else {
      toast.error('Aucun PDF disponible pour ce contrat');
    }
  };

  const handleSendContract = async (contract: Contract) => {
    try {
      const { updateDocument, getDocument, addDocument } = await import('@/lib/db');
      await updateDocument('contracts', contract.id, {
        status: 'sent',
        sent_at: new Date().toLocaleDateString('fr-FR')
      });

      // Notif + push + email (best effort)
      try {
        const contractRaw = (await getDocument('contracts', contract.id)) as any;
        const clientId = contractRaw?.client_id || null;
        const clientEmail = contractRaw?.client_email || null;
        if (clientId) {
          const clientRaw = (await getDocument('clients', clientId)) as any;
          const clientUserId = clientRaw?.client_user_id || null;
          const reference = contractRaw?.reference || contract.reference || 'Contrat';

          if (clientUserId) {
            await addDocument('notifications', {
              recipient_id: clientUserId,
              type: 'document',
              title: 'Contrat envoyé',
              message: `Votre contrat est disponible : ${reference}`,
              link: '/espace-client/documents',
              read: false,
              created_at: new Date(),
              planner_id: user?.uid,
              client_id: clientId,
              meta: { doc_type: 'contrat', reference, contract_id: contract.id },
            });

            try {
              const { sendPushToRecipient } = await import('@/lib/push');
              await sendPushToRecipient({
                recipientId: clientUserId,
                title: 'Contrat envoyé',
                body: `Votre contrat est disponible : ${reference}`,
                link: '/espace-client/documents',
              });
            } catch (e) {
              console.warn('Unable to send push:', e);
            }

            try {
              const { sendEmailToUid } = await import('@/lib/email');
              await sendEmailToUid({
                recipientUid: clientUserId,
                subject: 'Contrat envoyé - Le Oui Parfait',
                text: `Votre contrat est disponible : ${reference}.\n\nConnectez-vous à votre espace client pour le consulter.`,
              });
            } catch (e) {
              console.warn('Unable to send email (uid):', e);
            }
          } else if (clientEmail) {
            try {
              const { sendEmailToAddress } = await import('@/lib/email');
              await sendEmailToAddress({
                recipientEmail: clientEmail,
                subject: 'Contrat envoyé - Le Oui Parfait',
                text: `Votre contrat est disponible : ${reference}.\n\nConnectez-vous à votre espace client pour le consulter.`,
              });
            } catch (e) {
              console.warn('Unable to send email (address):', e);
            }
          }
        }
      } catch (e) {
        console.warn('Unable to notify client for contract send:', e);
      }

      toast.success('Contrat envoyé au client');
      fetchContracts();
    } catch (e) {
      console.error('Error sending contract:', e);
      toast.error('Erreur lors de l\'envoi du contrat');
    }
  };

  const handleSignContract = async (contract: Contract) => {
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) {
        toast.error('Vous devez être connecté');
        return;
      }

      const { getDocument } = await import('@/lib/db');
      const contractRaw = (await getDocument('contracts', contract.id)) as any;
      const envelopeIdExisting = String(contractRaw?.docusign?.envelope_id || '');
      let envelopeId = envelopeIdExisting;

      if (!envelopeId) {
        const createRes = await fetch('/api/docusign/create-envelope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ docType: 'contract', docId: contract.id }),
        });
        const createJson = await createRes.json().catch(() => null);
        if (!createRes.ok) {
          toast.error(createJson?.error || 'Impossible de préparer la signature');
          return;
        }
        envelopeId = String(createJson?.envelopeId || '');
      }

      if (!envelopeId) {
        toast.error('Impossible de préparer la signature');
        return;
      }

      const tryRecipientView = async (targetEnvelopeId: string) => {
        const viewRes = await fetch('/api/docusign/recipient-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ envelopeId: targetEnvelopeId, recipientRole: 'planner' }),
        });
        const viewJson = await viewRes.json().catch(() => null);
        return { ok: viewRes.ok, json: viewJson };
      };

      let viewAttempt = await tryRecipientView(envelopeId);

      const viewError = String(viewAttempt?.json?.error || '').toLowerCase();
      if (!viewAttempt.ok && viewError.includes('out of sequence')) {
        toast.error(viewAttempt?.json?.error || 'Impossible de démarrer la signature');
        return;
      }

      if (!viewAttempt.ok) {
        toast.error(viewAttempt?.json?.error || 'Impossible de démarrer la signature');
        return;
      }

      const url = String(viewAttempt?.json?.url || '');
      if (!url) {
        toast.error('URL de signature manquante');
        return;
      }

      window.location.href = url;
    } catch (e) {
      console.error('Error signing contract:', e);
      toast.error('Erreur lors de la signature du contrat');
    }
  };

  const handleCancelContract = async (contract: Contract) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le contrat ${contract.reference} ?`)) return;
    
    try {
      const { deleteDocument, getDocuments } = await import('@/lib/db');

      try {
        const linkedDocs = await getDocuments('documents', [
          { field: 'contract_id', operator: '==', value: contract.id },
        ]);
        await Promise.all(
          (linkedDocs as any[]).map((d) => deleteDocument('documents', d.id))
        );
      } catch (e) {
        console.error('Error deleting linked documents for contract:', e);
      }

      await deleteDocument('contracts', contract.id);
      toast.success('Contrat supprimé');
      fetchContracts();
    } catch (e) {
      console.error('Error deleting contract:', e);
      toast.error('Erreur lors de la suppression du contrat');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Contrats
            </h1>
            <p className="text-brand-gray">
              Gérez tous vos contrats clients et prestataires
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => setIsContractModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un contrat..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun contrat'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier contrat'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsContractModalOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                <Plus className="h-4 w-4 mr-2" /> Créer un contrat
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedContracts.map((contract) => {
            const status = statusConfig[contract.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            const dsStatusRaw = String(contract?.docusign?.status || '').toLowerCase();
            const dsRecipients = contract?.docusign?.recipients || null;
            const adminRecipientStatus = String(dsRecipients?.planner?.status || '').toLowerCase();
            const clientRecipientStatus = String(dsRecipients?.client?.status || '').toLowerCase();

            const adminSigned = adminRecipientStatus === 'completed';
            const clientSigned = clientRecipientStatus === 'completed';
            const fullySigned = contract.status === 'signed' || dsStatusRaw === 'completed' || (adminSigned && clientSigned);

            return (
              <Card key={contract.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-brand-turquoise" />
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-label text-brand-gray mb-1">
                      {contract.reference}
                    </p>
                    <h3 className="text-lg font-bold text-brand-purple mb-1 truncate" title={contract.title}>
                      {contract.title.length > 30 ? `${contract.title.substring(0, 30)}...` : contract.title}
                    </h3>
                    <p className="text-sm text-brand-gray truncate" title={contract.client}>
                      {contract.client.length > 25 ? `${contract.client.substring(0, 25)}...` : contract.client}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Type:</span>
                      <span className="font-medium text-brand-purple">
                        {typeLabels[contract.type as keyof typeof typeLabels]}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Montant:</span>
                      <span className="font-bold text-brand-purple">
                        {contract.amount.toLocaleString()} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray">Créé le:</span>
                      <span className="text-brand-purple">
                        {contract.createdAt}
                      </span>
                    </div>
                    {contract.signedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-gray">Signé le:</span>
                        <span className="text-green-600 font-medium">
                          {contract.signedAt}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-1"
                        onClick={() => handleViewContract(contract)}
                      >
                        <Eye className="h-3 w-3" />
                        <span className="text-xs">Voir</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                        onClick={() => handleDownloadContract(contract)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      {contract.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white text-xs"
                          onClick={() => handleSendContract(contract)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Envoyer
                        </Button>
                      )}

                      {(contract.status === 'draft' || contract.status === 'sent') && !fullySigned && !adminSigned && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-400 text-green-600 hover:bg-green-500 hover:text-white text-xs"
                          onClick={() => handleSignContract(contract)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Signer
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-400 text-red-600 hover:bg-red-500 hover:text-white text-xs"
                        onClick={() => handleCancelContract(contract)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer
                      </Button>
                    </div>

                    {(contract.status === 'draft' || contract.status === 'sent') && !fullySigned && adminSigned ? (
                      <div className="text-xs text-brand-gray pt-1">
                        Signature prestataire effectuée — en attente du client.
                      </div>
                    ) : null}

                    {(contract.status === 'draft' || contract.status === 'sent') && !fullySigned && clientSigned && !adminSigned ? (
                      <div className="text-xs text-brand-gray pt-1">
                        Le client a signé — il reste votre signature.
                      </div>
                    ) : null}

                    {fullySigned ? (
                      <div className="text-xs text-green-700 font-medium pt-1">
                        Contrat signé.
                      </div>
                    ) : null}
                  </div>

                </div>
              </Card>
            );
          })}
          </div>
        )}
        {!loading && filteredContracts.length > contractsPerPage && (
          <Card className="p-4 shadow-xl border-0">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-brand-gray">
                  Page {currentPage} sur {totalPages}
                </span>
                <span className="text-xs text-brand-gray">({filteredContracts.length} contrat{filteredContracts.length > 1 ? 's' : ''})</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-2"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>

      <NewContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onContractCreated={fetchContracts}
      />

      {/* Modal pour afficher le contenu du contrat */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-turquoise" />
              {selectedContract?.reference} - {selectedContract?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedContract?.client}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                  {selectedContract.contractContent}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
