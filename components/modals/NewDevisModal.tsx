'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, getDocuments, addDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import jsPDF from 'jspdf';
import { uploadPdf } from '@/lib/storage';

interface DevisItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface NewDevisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevisCreated?: () => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

const prestationDetails: Record<string, string> = {
  'coord-complete':
    "Un accompagnement de A à Z : rendez-vous, rétroplanning, suivi des prestataires et pilotage du projet jusqu'au jour J.",
  'coord-jourj':
    "Présence et coordination le jour J : installation, gestion du timing, coordination des prestataires et sérénité pour vous.",
  'coord-partielle':
    "Vous gardez la main, je vous épaules sur les points clés : planning, prestataires, organisation et suivi selon vos besoins.",
  'rv-prepa':
    "Un rendez-vous concret pour avancer : point d'organisation, questions/réponses, priorités, et prochaines actions.",
  retroplanning:
    "Un plan clair et réaliste, étape par étape, pour ne rien oublier et garder le contrôle jusqu'au mariage.",
  'recherche-lieu':
    "Sélection de lieux adaptés à vos critères (budget, capacité, style), prises de contact et organisation des visites.",
  'recherche-presta':
    "Sélection de prestataires fiables, brief, comparatif, et recommandations personnalisées selon votre style.",
  negociation:
    "Analyse des devis, échanges avec les prestataires, ajustements et optimisation pour aligner budget et attentes.",
  'gestion-budget': "Suivi des dépenses, arbitrages, et visibilité claire : où on en est et où on va.",
  'gestion-invites':
    "Organisation des réponses, relances, suivi des régimes/allergies et consolidation des informations.",
  'plan-table': "Aide à la création du plan de table : cohérence, contraintes, et fluidité le jour J.",
  'visite-technique':
    "Repérage sur place pour anticiper les détails logistiques : circulations, installations, contraintes du lieu.",
  'timing-jourj': "Un déroulé précis et réaliste pour que tout s'enchaîne naturellement, sans stress ni surprises.",
  'coord-presta-jourj':
    "Brief et coordination de tous les prestataires le jour J pour une exécution fluide et conforme au plan.",
  'presence-jourj':
    "Présence sur site pour superviser, gérer les imprévus et vous laisser profiter pleinement de votre journée.",
  'decoration-conception':
    "Proposition scénographique cohérente : ambiance, matières, couleurs, et intentions déco pour sublimer votre lieu.",
  'decoration-mise-en-place':
    "Installation et mise en place de la décoration selon le plan validé (hors location/achat de matériel).",
  papeterie: "Conseils et coordination autour de la papeterie (invitations, menus, signalétique) pour une harmonie globale.",
  'cahier-charges': "Cadrage du projet + moodboard : intentions, inspirations et lignes directrices pour guider vos choix.",
  'accompagnement-10h': "Forfait 10h d'accompagnement : flexible, sur vos priorités, pour avancer efficacement.",
};

const defaultPrestations = [
  { id: 'coord-complete', label: 'Coordination complète du mariage', unitPrice: 2500 },
  { id: 'coord-jourj', label: 'Coordination le jour J', unitPrice: 1200 },
  { id: 'coord-partielle', label: 'Coordination partielle (à partir de)', unitPrice: 1500 },
  { id: 'rv-prepa', label: 'Rendez-vous de préparation (2h)', unitPrice: 180 },
  { id: 'retroplanning', label: 'Rétroplanning & planning détaillé', unitPrice: 350 },
  { id: 'recherche-lieu', label: 'Recherche & sélection du lieu', unitPrice: 500 },
  { id: 'recherche-presta', label: 'Recherche prestataires (forfait)', unitPrice: 800 },
  { id: 'negociation', label: 'Négociation & gestion des devis prestataires', unitPrice: 450 },
  { id: 'gestion-budget', label: 'Gestion du budget & suivi', unitPrice: 300 },
  { id: 'gestion-invites', label: 'Gestion des invités (RSVP) & relances', unitPrice: 400 },
  { id: 'plan-table', label: 'Plan de table & placement', unitPrice: 250 },
  { id: 'visite-technique', label: 'Visite technique (repérage sur site)', unitPrice: 220 },
  { id: 'timing-jourj', label: 'Déroulé minute par minute (jour J)', unitPrice: 180 },
  { id: 'coord-presta-jourj', label: 'Coordination des prestataires (jour J)', unitPrice: 450 },
  { id: 'presence-jourj', label: 'Présence wedding planner (jour J)', unitPrice: 650 },
  { id: 'decoration-conception', label: 'Conception décoration & scénographie', unitPrice: 700 },
  { id: 'decoration-mise-en-place', label: 'Mise en place décoration (forfait)', unitPrice: 500 },
  { id: 'papeterie', label: 'Papeterie (conseil & coordination)', unitPrice: 250 },
  { id: 'cahier-charges', label: 'Cahier des charges & moodboard', unitPrice: 300 },
  { id: 'accompagnement-10h', label: 'Accompagnement personnalisé (forfait 10h)', unitPrice: 1000 },
];

const getPrestationDetail = (prestationId: string) => {
  return prestationDetails[prestationId] || '';
};

const getPrestationIdFromItemId = (itemId: string) => {
  if (!itemId) return '';
  if (itemId.startsWith('prestation:')) return itemId.replace('prestation:', '');
  return itemId;
};

export function NewDevisModal({ isOpen, onClose, onDevisCreated }: NewDevisModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfMode, setPdfMode] = useState<'generate' | 'import'>('generate');
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [selectedPrestations, setSelectedPrestations] = useState<string[]>([]);

  const [agencyInfo, setAgencyInfo] = useState<any>(null);
  const [agencyName, setAgencyName] = useState('');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencySiret, setAgencySiret] = useState('');

  const [devisTitle, setDevisTitle] = useState('Devis');
  const [devisIntro, setDevisIntro] = useState('');
  const [items, setItems] = useState<DevisItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch clients
  useEffect(() => {
    if (isOpen && user) {
      fetchClients();
      void fetchAgencyInfo();

      setActiveTab('form');
      setPdfMode('generate');
      setPdfFile(null);

      const defaultIntro = "Merci pour votre confiance. Vous trouverez ci-dessous notre proposition détaillée de prestations pour votre mariage.";
      const defaultNotes =
        "Conditions :\n" +
        "- Devis valable 30 jours à compter de la date d'émission.\n" +
        "- Un acompte de 30% est demandé à l'acceptation du devis, le solde selon l'échéancier convenu.\n" +
        "- Les prestations sont réalisées sur rendez-vous. Toute modification fera l'objet d'un ajustement écrit.\n" +
        "- Les tarifs indiqués sont TTC (TVA 20%).";

      setDevisTitle((t) => t || 'Devis');
      setDevisIntro((v) => (v && v.trim() ? v : defaultIntro));
      setNotes((v) => (v && v.trim() ? v : defaultNotes));
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPrestations([]);
      setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
      setValidUntil('');
      setDevisIntro('');
      setNotes('');
    }
  }, [isOpen]);

  const fetchClients = async () => {
    if (!user) return;
    try {
      const data = await getDocuments('clients', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.partner ? `${d.name} & ${d.partner}` : d.name,
        email: d.email || '',
      }));
      setClients(mapped);
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  const fetchAgencyInfo = async () => {
    if (!user) return;
    try {
      const agencyDoc = await getDocument('agency', 'leOuiParfait').catch(() => null);
      if (agencyDoc) {
        const agency: any = agencyDoc;
        setAgencyInfo(agency);
        setAgencyName(agency.name || agency.representative_name || agency.representativeName || '');
        setAgencyAddress(agency.address || '');
        setAgencyEmail(agency.email || '');
        setAgencyPhone(agency.phone || '');
        setAgencySiret(agency.siret || '');
        return;
      }

      const data = await getDocuments('agencies', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      if (data.length > 0) {
        const agency = data[0] as any;
        setAgencyInfo(agency);
        setAgencyName(agency.name || agency.representative_name || '');
        setAgencyAddress(agency.address || '');
        setAgencyEmail(agency.email || '');
        setAgencyPhone(agency.phone || '');
        setAgencySiret(agency.siret || '');
      }
    } catch (e) {
      console.error('Error fetching agency info:', e);
    }
  };

  const uploadPdfToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
      formData
    );

    return res.data.secure_url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      toast({
        title: 'Fichier ajouté',
        description: `${e.target.files[0].name} a été sélectionné`,
      });
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const togglePrestation = (prestationId: string) => {
    const p = defaultPrestations.find((x) => x.id === prestationId);
    if (!p) return;

    setSelectedPrestations((prev) => {
      const exists = prev.includes(prestationId);
      const next = exists ? prev.filter((x) => x !== prestationId) : [...prev, prestationId];
      return next;
    });

    setItems((prev) => {
      const lineId = `prestation:${prestationId}`;
      const exists = prev.some((it) => it.id === lineId);

      if (exists) {
        const next = prev.filter((it) => it.id !== lineId);
        return next.length ? next : [{ id: '1', description: '', quantity: 1, unitPrice: 0 }];
      }

      const emptyIndex = prev.findIndex((it) => !it.description && (it.unitPrice === 0 || Number.isNaN(it.unitPrice)));
      if (emptyIndex >= 0) {
        const next = prev.slice();
        next[emptyIndex] = { id: lineId, description: p.label, quantity: 1, unitPrice: p.unitPrice };
        return next;
      }

      return [...prev, { id: lineId, description: p.label, quantity: 1, unitPrice: p.unitPrice }];
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof DevisItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTTC = totalHT * 1.2; // TVA 20%
    return { totalHT, totalTTC };
  };

  const generatePdf = async (reference: string): Promise<Blob> => {
    const node = previewRef.current;
    if (!node) {
      throw new Error('Preview introuvable pour la génération PDF');
    }

    const { default: html2canvas } = await import('html2canvas');

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const padding = 24;

    const scale = 1.25;
    const quality = 0.8;
    const totalHeight = node.scrollHeight;
    const imgWidth = pageWidth - padding * 2;
    const pdfInnerHeight = pageHeight - padding * 2;
    const ptPerPx = imgWidth / Math.max(1, node.scrollWidth);
    const maxSliceHeightPx = Math.floor(pdfInnerHeight / ptPerPx);
    const sliceHeight = Math.max(300, maxSliceHeightPx);

    let y = 0;
    let isFirstPage = true;

    while (y < totalHeight) {
      const canvas = await html2canvas(node, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: node.scrollWidth,
        height: Math.min(sliceHeight, totalHeight - y),
        windowWidth: node.scrollWidth,
        windowHeight: sliceHeight,
        y,
      } as any);

      const imgData = canvas.toDataURL('image/jpeg', quality);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (!isFirstPage) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', padding, padding, imgWidth, imgHeight, undefined, 'FAST');
      isFirstPage = false;
      y += sliceHeight;
    }

    return pdf.output('blob');
  };

  const handleSubmit = async () => {
    if (!user || !selectedClient) {
      sonnerToast.error('Veuillez sélectionner un client');
      return;
    }

    setLoading(true);
    try {
      const { totalHT, totalTTC } = calculateTotal();
      const client = clients.find(c => c.id === selectedClient);

      const reference = `DEVIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      let pdfUrl = '';
      if (pdfMode === 'import') {
        if (pdfFile) {
          pdfUrl = await uploadPdfToCloudinary(pdfFile);
        }
      } else {
        sonnerToast.info('Génération du PDF en cours...');
        const pdfBlob = await generatePdf(reference);
        sonnerToast.info('Upload du PDF vers le cloud...');
        pdfUrl = await uploadPdf(pdfBlob, reference);
      }

      const devisData = {
        planner_id: user.uid,
        reference,
        client_id: selectedClient,
        client: client?.name || '',
        client_email: client?.email || '',
        date: new Date().toLocaleDateString('fr-FR'),
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        tva: 20,
        status: 'sent',
        valid_until: validUntil,
        title: devisTitle,
        intro: devisIntro,
        description: notes,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
        pdf_url: pdfUrl,
        created_at: new Date(),
        sent_at: new Date().toLocaleDateString('fr-FR'),
      };

      const createdDevis = await addDocument('devis', devisData);

      // Publier aussi dans la collection documents pour visibilité côté admin (onglet Documents fiche client)
      if (pdfUrl) {
        try {
          const evts = await getDocuments('events', [{ field: 'client_id', operator: '==', value: selectedClient }]);
          const weddingEvt = ((evts as any[]) || []).find((x) => Boolean(x?.event_date)) || (evts as any[])?.[0] || null;
          await addDocument('documents', {
            planner_id: user.uid,
            client_id: selectedClient,
            event_id: weddingEvt?.id || null,
            name: `Devis - ${reference}`,
            type: 'devis',
            file_url: pdfUrl,
            file_type: 'application/pdf',
            uploaded_by: 'planner',
            uploaded_at: new Date().toLocaleDateString('fr-FR'),
            created_timestamp: new Date(),
            devis_id: (createdDevis as any)?.id || null,
            status: devisData.status,
          });
        } catch (e) {
          console.error('Error creating documents entry for devis:', e);
        }
      }

      // Notif + push + email côté client (best effort)
      try {
        const clientRaw = (await getDocument('clients', selectedClient)) as any;
        const clientUserId = clientRaw?.client_user_id || null;
        if (clientUserId) {
          await addDocument('notifications', {
            recipient_id: clientUserId,
            type: 'document',
            title: 'Nouveau devis',
            message: `Un nouveau devis est disponible : ${reference}`,
            link: '/espace-client/documents',
            read: false,
            created_at: new Date(),
            planner_id: user.uid,
            client_id: selectedClient,
            meta: { doc_type: 'devis', reference },
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: clientUserId,
              title: 'Nouveau devis',
              body: `Un nouveau devis est disponible : ${reference}`,
              link: '/espace-client/documents',
            });
          } catch (e) {
            console.warn('Unable to send push:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: clientUserId,
              subject: 'Nouveau devis - Le Oui Parfait',
              text: `Un nouveau devis est disponible : ${reference}.\n\nConnectez-vous à votre espace client pour le consulter.`,
            });
          } catch (e) {
            console.warn('Unable to send email:', e);
          }
        }
      } catch (e) {
        console.warn('Unable to notify client for devis:', e);
      }
      
      sonnerToast.success(`Devis de ${totalTTC.toLocaleString()}€ TTC créé pour ${client?.name}`);
      
      if (onDevisCreated) {
        onDevisCreated();
      }
      
      onClose();
    } catch (e) {
      console.error('Error creating devis:', e);
      sonnerToast.error('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  const { totalHT, totalTTC } = calculateTotal();
  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple">Créer un nouveau devis</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Informations</TabsTrigger>
            <TabsTrigger value="preview">Prévisualisation</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client *</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientData && (
                  <p className="text-xs text-brand-gray mt-1">Email: {selectedClientData.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="validUntil">Valide jusqu'au</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <Label>Prestations (sélection rapide)</Label>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {defaultPrestations.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2 p-3 border rounded cursor-pointer bg-white transition-colors ${
                      selectedPrestations.includes(p.id)
                        ? 'border-brand-turquoise bg-brand-turquoise/5'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrestations.includes(p.id)}
                      onChange={() => togglePrestation(p.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{p.label}</div>
                      <div className="text-xs text-brand-gray mt-1">{p.unitPrice.toLocaleString('fr-FR')} € HT</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-brand-gray mt-2">
                Les lignes ajoutées restent modifiables (description, quantité, prix).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="devisTitle">Titre</Label>
                <Input id="devisTitle" value={devisTitle} onChange={(e) => setDevisTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="devisIntro">Phrase d'introduction (optionnel)</Label>
                <Input id="devisIntro" value={devisIntro} onChange={(e) => setDevisIntro(e.target.value)} />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <Label>PDF</Label>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer bg-white">
                  <input
                    type="radio"
                    name="pdfMode"
                    checked={pdfMode === 'generate'}
                    onChange={() => {
                      setPdfMode('generate');
                      setPdfFile(null);
                    }}
                  />
                  <span className="text-sm">Générer automatiquement le PDF</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer bg-white">
                  <input
                    type="radio"
                    name="pdfMode"
                    checked={pdfMode === 'import'}
                    onChange={() => setPdfMode('import')}
                  />
                  <span className="text-sm">Importer un PDF existant</span>
                </label>
              </div>

              {pdfMode === 'import' ? (
                <div className="mt-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-turquoise transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-brand-gray mb-2" />
                      <p className="text-sm text-brand-gray">
                        {pdfFile ? pdfFile.name : 'Cliquez pour importer un PDF'}
                      </p>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Prestations</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-12 md:col-span-5">
                      <Input
                        placeholder="Description de la prestation"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        type="number"
                        placeholder="Qté"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Input
                        type="number"
                        placeholder="Prix unitaire HT"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-center justify-center">
                      <p className="text-sm font-medium text-brand-purple">
                        {(item.quantity * item.unitPrice).toFixed(2)}€
                      </p>
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-center justify-center">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-brand-beige/20 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brand-gray">Total HT</span>
                <span className="font-medium text-brand-purple">{totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-gray">TVA (20%)</span>
                <span className="font-medium text-brand-purple">{(totalTTC - totalHT).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span className="text-brand-purple">Total TTC</span>
                <span className="text-brand-turquoise">{totalTTC.toFixed(2)} €</span>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes / Conditions (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions de paiement, délais, etc."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={() => setActiveTab('preview')}
                disabled={!selectedClient}
              >
                <Eye className="h-4 w-4" />
                Voir la prévisualisation
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="py-4">
            <div className="w-full overflow-x-auto">
              <div
                ref={(el) => {
                  previewRef.current = el;
                }}
                className="bg-white border-2 border-gray-200 rounded-lg shadow-lg mx-auto"
                style={{ width: 794, minHeight: 1123 }}
              >
                <div className="p-10">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="mb-3">
                        <Image
                          src="/logo-horizontal.png"
                          alt="Le Oui Parfait"
                          width={180}
                          height={54}
                          className="object-contain"
                        />
                      </div>
                      <div className="text-xs text-gray-700 space-y-1">
                        {agencyName ? <div className="font-semibold">{agencyName}</div> : null}
                        {agencyAddress ? <div>{agencyAddress}</div> : null}
                        {agencySiret ? <div>SIRET: {agencySiret}</div> : null}
                        {agencyEmail ? <div>{agencyEmail}</div> : null}
                        {agencyPhone ? <div>{agencyPhone}</div> : null}
                      </div>
                    </div>

                    <div className="w-[260px] text-right">
                      <div className="text-2xl font-bold text-brand-purple">{devisTitle || 'Devis'}</div>
                      <div className="text-sm text-gray-600 mt-1">Brouillon</div>
                      <div className="mt-4 text-sm">
                        <div className="text-gray-500">Référence</div>
                        <div className="font-semibold">(auto)</div>
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="text-gray-500">Date</div>
                        <div className="font-semibold">{new Date().toLocaleDateString('fr-FR')}</div>
                      </div>
                      {validUntil ? (
                        <div className="mt-2 text-sm">
                          <div className="text-gray-500">Valide jusqu'au</div>
                          <div className="font-semibold">{new Date(validUntil).toLocaleDateString('fr-FR')}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4">
                      <div className="text-xs text-gray-500">Client</div>
                      <div className="font-semibold text-gray-900 mt-1">{selectedClientData?.name || '—'}</div>
                      <div className="text-sm text-gray-700 mt-1">{selectedClientData?.email || ''}</div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="text-xs text-gray-500">Objet</div>
                      <div className="font-semibold text-gray-900 mt-1">Prestations mariage</div>
                      {devisIntro ? <div className="text-sm text-gray-700 mt-1">{devisIntro}</div> : null}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Détail</div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 bg-gray-50 text-xs font-semibold text-gray-700 px-4 py-3">
                        <div className="col-span-6">Prestation</div>
                        <div className="col-span-2 text-right">Qté</div>
                        <div className="col-span-2 text-right">PU HT</div>
                        <div className="col-span-2 text-right">Total HT</div>
                      </div>
                      <div className="divide-y">
                        {items.map((it) => (
                          <div key={it.id} className="grid grid-cols-12 px-4 py-3 text-sm">
                            <div className="col-span-6">
                              <div className="text-gray-900">{it.description || '—'}</div>
                              {getPrestationDetail(getPrestationIdFromItemId(it.id)) ? (
                                <div className="text-xs text-gray-600 mt-1 leading-snug">
                                  {getPrestationDetail(getPrestationIdFromItemId(it.id))}
                                </div>
                              ) : null}
                            </div>
                            <div className="col-span-2 text-right text-gray-700">{it.quantity}</div>
                            <div className="col-span-2 text-right text-gray-700">{it.unitPrice.toFixed(2)} €</div>
                            <div className="col-span-2 text-right font-semibold text-gray-900">{(it.quantity * it.unitPrice).toFixed(2)} €</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <div className="w-[320px] border rounded-lg p-4">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Total HT</span>
                        <span className="font-semibold text-gray-900">{totalHT.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700 mt-2">
                        <span>TVA (20%)</span>
                        <span className="font-semibold text-gray-900">{(totalTTC - totalHT).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t">
                        <span>Total TTC</span>
                        <span className="text-brand-turquoise">{totalTTC.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  {notes ? (
                    <div className="mt-8">
                      <div className="text-sm font-semibold text-gray-900 mb-2">Notes / conditions</div>
                      <div className="border rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{notes}</div>
                    </div>
                  ) : null}

                  <div className="mt-10 pt-6 border-t text-xs text-gray-500">
                    Merci pour votre confiance.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={!selectedClient || loading || (pdfMode === 'import' && !pdfFile)}
          >
            {loading ? 'Création...' : 'Créer le devis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
