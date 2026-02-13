'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { FileText, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, getDocuments, addDocument, updateDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';
import jsPDF from 'jspdf';
import { uploadPdf } from '@/lib/storage';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: () => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Prospect {
  id: string;
  name: string;
  partner?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
}

const prestationsDisponibles = [
  { id: '1', nom: 'Coordination complète du mariage', prix: 2500 },
  { id: '2', nom: 'Coordination le jour J uniquement', prix: 1200 },
  { id: '3', nom: 'Recherche et sélection des prestataires', prix: 800 },
  { id: '4', nom: 'Gestion du planning et rétroplanning', prix: 600 },
  { id: '5', nom: 'Accompagnement personnalisé (forfait 10h)', prix: 1000 },
  { id: '6', nom: 'Décoration et mise en place', prix: 1500 },
  { id: '7', nom: 'Gestion des invitations et réponses', prix: 400 },
  { id: '8', nom: 'Recherche de lieu de réception', prix: 500 },
];

interface AdminInfo {
  nomRepresentant: string;
  adresseAgence: string;
  siret: string;
  ville: string;
  email: string;
  telephone: string;
}

const adminInfoDefault: AdminInfo = {
  nomRepresentant: 'Marie DUPONT',
  adresseAgence: '12 Avenue des Mariages, 35000 Rennes',
  siret: '123 456 789 00012',
  ville: 'Rennes',
  email: 'contact@leouiparfait.fr',
  telephone: '02 99 00 00 00',
};

const contractTemplate = `CONTRAT DE PRESTATION DE SERVICES
ORGANISATION ET COORDINATION D'ÉVÉNEMENT MATRIMONIAL


ENTRE LES SOUSSIGNÉS :

D'UNE PART,

La société LE OUI PARFAIT, société par actions simplifiée au capital de 10 000 euros, immatriculée au Registre du Commerce et des Sociétés de Rennes sous le numéro [SIRET_AGENCE], dont le siège social est situé [ADRESSE_AGENCE], représentée par [NOM_REPRESENTANT] en sa qualité de Président, dûment habilité aux fins des présentes.

Email : [EMAIL_AGENCE]
Téléphone : [TELEPHONE_AGENCE]

Ci-après dénommée « le Prestataire »,

D'UNE PART,

ET :

Monsieur et Madame [NOM_CLIENT]
Demeurant : [ADRESSE_CLIENT]
Email : [EMAIL_CLIENT]
Téléphone : [TELEPHONE_CLIENT]

Ci-après dénommés « le Client » ou « les Clients »,

D'AUTRE PART,

Ci-après dénommés ensemble « les Parties ».


PRÉAMBULE

Le Client souhaite confier au Prestataire l'organisation et/ou la coordination de son événement matrimonial. Le Prestataire dispose des compétences, de l'expérience et des moyens nécessaires pour répondre aux attentes du Client dans le respect des normes professionnelles en vigueur.

Les Parties ont convenu de formaliser leur collaboration dans le cadre du présent contrat, dont les termes et conditions sont ci-après définis.


IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :


ARTICLE 1 - OBJET DU CONTRAT

Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire s'engage à fournir au Client des prestations de conseil, d'organisation et de coordination pour la réalisation de son événement matrimonial prévu le [DATE_MARIAGE] au [LIEU_MARIAGE].

Les prestations détaillées sont énumérées à l'article 2 du présent contrat.


ARTICLE 2 - DESCRIPTION DES PRESTATIONS

Le Prestataire s'engage à fournir les prestations suivantes :

[PRESTATIONS]

Le détail précis de chaque prestation, ainsi que les livrables associés, sont décrits dans l'annexe technique jointe au présent contrat et en faisant partie intégrante.

Le Prestataire mettra en œuvre tous les moyens nécessaires à la bonne exécution de ses obligations, dans le respect des règles de l'art et des normes professionnelles applicables.


ARTICLE 3 - DURÉE DU CONTRAT

Le présent contrat prend effet à compter de sa signature par les deux Parties et se poursuivra jusqu'à la réalisation complète de l'événement matrimonial et l'exécution de l'ensemble des prestations convenues.

La date de fin prévisionnelle du contrat est fixée au [DATE_FIN_CONTRAT], sous réserve de la bonne exécution des obligations respectives des Parties.


ARTICLE 4 - CONDITIONS FINANCIÈRES

4.1 - Prix

Le montant total des prestations définies à l'article 2 s'élève à la somme de [MONTANT_TOTAL] euros TTC (Toutes Taxes Comprises).

Ce montant est ferme et définitif, sauf modification expresse des prestations convenues, auquel cas un avenant au présent contrat sera établi.

4.2 - Modalités de paiement

Le règlement du prix s'effectuera selon l'échéancier suivant :

- Un acompte de 30% du montant total, soit [MONTANT_ACOMPTE] euros TTC, payable à la signature du présent contrat par virement bancaire ou chèque.
- Un second versement de 40% du montant total, soit [MONTANT_SECOND] euros TTC, payable au plus tard le [DATE_SECOND_PAIEMENT].
- Le solde de 30%, soit [MONTANT_SOLDE] euros TTC, payable au plus tard 15 jours avant la date de l'événement, soit avant le [DATE_SOLDE].

4.3 - Retard de paiement

Tout retard de paiement entraînera de plein droit, et sans mise en demeure préalable, l'application de pénalités de retard calculées sur la base du taux d'intérêt appliqué par la Banque Centrale Européenne à son opération de refinancement la plus récente, majoré de 10 points de pourcentage.

En outre, toute somme non payée à l'échéance donnera lieu au paiement d'une indemnité forfaitaire de 40 euros pour frais de recouvrement, sans préjudice d'une indemnisation complémentaire si les frais de recouvrement effectivement exposés sont supérieurs à ce montant.


ARTICLE 5 - OBLIGATIONS DU PRESTATAIRE

Le Prestataire s'engage à :

5.1 - Exécuter les prestations avec diligence, compétence et dans le respect des règles de l'art.

5.2 - Respecter les délais convenus et informer le Client sans délai de toute difficulté susceptible d'affecter la bonne exécution des prestations.

5.3 - Tenir le Client régulièrement informé de l'avancement des prestations et lui soumettre pour validation les choix importants.

5.4 - Coordonner l'intervention des prestataires tiers sélectionnés en accord avec le Client.

5.5 - Respecter la confidentialité des informations personnelles et des données communiquées par le Client.

5.6 - Souscrire et maintenir en vigueur une assurance responsabilité civile professionnelle couvrant les dommages pouvant résulter de l'exécution des prestations.


ARTICLE 6 - OBLIGATIONS DU CLIENT

Le Client s'engage à :

6.1 - Fournir au Prestataire toutes les informations, documents et éléments nécessaires à la bonne exécution des prestations.

6.2 - Répondre dans les délais convenus aux demandes de validation et aux sollicitations du Prestataire.

6.3 - Respecter l'échéancier de paiement défini à l'article 4.2.

6.4 - Informer le Prestataire sans délai de toute modification de ses coordonnées ou de ses souhaits concernant l'événement.

6.5 - Collaborer de bonne foi avec le Prestataire et les prestataires tiers pour faciliter la réalisation de l'événement.


ARTICLE 7 - MODIFICATION DES PRESTATIONS

Toute modification des prestations initialement convenues devra faire l'objet d'un accord écrit entre les Parties sous forme d'avenant au présent contrat.

Si la modification entraîne une augmentation ou une diminution du prix, celle-ci sera répercutée dans l'avenant et donnera lieu à un ajustement de l'échéancier de paiement.


ARTICLE 8 - RÉSILIATION ET ANNULATION

8.1 - Résiliation par le Client

Le Client peut résilier le présent contrat à tout moment moyennant le respect d'un préavis de 30 jours par lettre recommandée avec accusé de réception.

En cas de résiliation par le Client, les sommes suivantes resteront acquises au Prestataire à titre d'indemnité forfaitaire :

- En cas de résiliation plus de 6 mois avant la date de l'événement : 30% du montant total du contrat.
- En cas de résiliation entre 3 et 6 mois avant la date de l'événement : 50% du montant total du contrat.
- En cas de résiliation moins de 3 mois avant la date de l'événement : 70% du montant total du contrat.
- En cas de résiliation moins de 1 mois avant la date de l'événement : 100% du montant total du contrat.

Les sommes déjà versées viendront en déduction de cette indemnité. Si les sommes versées sont supérieures à l'indemnité due, le trop-perçu sera remboursé au Client dans un délai de 30 jours.

8.2 - Résiliation par le Prestataire

Le Prestataire peut résilier le présent contrat de plein droit, sans indemnité, en cas de manquement grave du Client à ses obligations contractuelles, notamment en cas de non-paiement d'une échéance après mise en demeure restée infructueuse pendant 15 jours.

8.3 - Force majeure

En cas de survenance d'un événement de force majeure au sens de l'article 1218 du Code civil rendant impossible l'exécution du contrat, celui-ci sera résilié de plein droit sans indemnité pour aucune des Parties. Les sommes déjà versées seront remboursées au Client au prorata des prestations non exécutées.


ARTICLE 9 - RESPONSABILITÉ

9.1 - Responsabilité du Prestataire

Le Prestataire est tenu à une obligation de moyens dans l'exécution des prestations. Sa responsabilité ne pourra être engagée qu'en cas de faute prouvée.

Le Prestataire ne saurait être tenu responsable :
- Des dommages résultant d'une faute, négligence ou défaillance du Client ou d'un prestataire tiers.
- Des événements imprévisibles et irrésistibles constitutifs de force majeure.
- Des modifications de dernière minute imposées par le Client.
- De la qualité des prestations fournies par les prestataires tiers, même s'ils ont été recommandés par le Prestataire.

9.2 - Limitation de responsabilité

En tout état de cause, la responsabilité du Prestataire est limitée au montant total des sommes effectivement perçues au titre du présent contrat.

9.3 - Assurance

Le Prestataire déclare avoir souscrit une assurance responsabilité civile professionnelle auprès de [NOM_ASSURANCE] couvrant les conséquences pécuniaires de sa responsabilité civile professionnelle.


ARTICLE 10 - PROPRIÉTÉ INTELLECTUELLE

Tous les documents, concepts, créations et éléments produits par le Prestataire dans le cadre de l'exécution du présent contrat demeurent sa propriété exclusive, sauf stipulation contraire.

Le Client dispose d'un droit d'utilisation de ces éléments strictement limité à la réalisation de son événement matrimonial. Toute autre utilisation, notamment commerciale, est interdite sans l'accord préalable écrit du Prestataire.


ARTICLE 11 - CONFIDENTIALITÉ

Chacune des Parties s'engage à conserver strictement confidentielles toutes les informations de nature confidentielle de l'autre Partie dont elle pourrait avoir connaissance dans le cadre de l'exécution du présent contrat.

Cet engagement de confidentialité demeurera en vigueur pendant toute la durée du contrat et pendant une période de 3 ans suivant son terme.


ARTICLE 12 - DONNÉES PERSONNELLES

Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, le Prestataire s'engage à traiter les données personnelles du Client dans le strict respect de la réglementation en vigueur.

Le Client dispose d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de ses données personnelles, qu'il peut exercer en adressant un courrier à l'adresse du siège social du Prestataire.


ARTICLE 13 - CESSION DU CONTRAT

Le présent contrat est conclu intuitu personae. En conséquence, aucune des Parties ne pourra céder ou transférer tout ou partie de ses droits et obligations au titre du présent contrat sans l'accord préalable écrit de l'autre Partie.


ARTICLE 14 - INDÉPENDANCE DES CLAUSES

Si l'une quelconque des stipulations du présent contrat était déclarée nulle ou inapplicable en application d'une loi, d'un règlement ou à la suite d'une décision de justice devenue définitive, elle serait réputée non écrite et les autres stipulations resteraient en vigueur.


ARTICLE 15 - MODIFICATION DU CONTRAT

Toute modification du présent contrat devra faire l'objet d'un avenant signé par les deux Parties.


ARTICLE 16 - DROIT APPLICABLE ET JURIDICTION COMPÉTENTE

Le présent contrat est soumis au droit français.

En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les Parties s'engagent à rechercher une solution amiable.

À défaut d'accord amiable dans un délai de 30 jours suivant la notification du différend par lettre recommandée avec accusé de réception, le litige sera porté devant les tribunaux compétents du ressort du siège social du Prestataire.


Fait à [VILLE], le [DATE_SIGNATURE]
En deux exemplaires originaux, dont un pour chaque Partie.


Signature du Prestataire                                    Signature du Client
Précédée de la mention                                       Précédée de la mention
« Lu et approuvé, bon pour accord »                          « Lu et approuvé, bon pour accord »


[NOM_REPRESENTANT]                                           [NOM_CLIENT]
Président de LE OUI PARFAIT`;

const vendorContractTemplate = `CONTRAT PRESTATAIRE

ENTRE LES SOUSSIGNÉS :

D'UNE PART,

La société LE OUI PARFAIT, société par actions simplifiée au capital de 10 000 euros, immatriculée sous le numéro [SIRET_AGENCE], dont le siège social est situé [ADRESSE_AGENCE], représentée par [NOM_REPRESENTANT].
Email : [EMAIL_AGENCE]
Téléphone : [TELEPHONE_AGENCE]

Ci-après dénommée « l'Agence »

D'UNE PART,

ET :

Le prestataire : [NOM_PRESTATAIRE]
Adresse : [ADRESSE_PRESTATAIRE]
Email : [EMAIL_PRESTATAIRE]
Téléphone : [TELEPHONE_PRESTATAIRE]
SIRET : [SIRET_PRESTATAIRE]

Ci-après dénommés « le Prestataire »

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET
Le présent contrat a pour objet de définir les conditions d'intervention du Prestataire pour l'événement du [DATE_MARIAGE] au [LIEU_MARIAGE].

ARTICLE 2 - PRESTATIONS
Le Prestataire s'engage à fournir les prestations suivantes :
[PRESTATIONS]

Le détail précis de chaque prestation, ainsi que les livrables associés, sont décrits dans l'annexe technique jointe au présent contrat et en faisant partie intégrante.

Le Prestataire mettra en œuvre tous les moyens nécessaires à la bonne exécution de ses obligations, dans le respect des règles de l'art et des normes professionnelles applicables.

ARTICLE 3 - CONDITIONS FINANCIÈRES
Le montant total des prestations est fixé à [MONTANT_TOTAL] euros TTC.

Fait à [VILLE], le [DATE_SIGNATURE]
En deux exemplaires originaux, dont un pour chaque Partie.

Signature Agence                              Signature Prestataire
Précédée de la mention                                       Précédée de la mention
« Lu et approuvé, bon pour accord »                          « Lu et approuvé, bon pour accord »

[NOM_REPRESENTANT]                            [NOM_PRESTATAIRE]`;

export function NewContractModal({ isOpen, onClose, onContractCreated }: NewContractModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);

  const [recipientType, setRecipientType] = useState<'client' | 'prospect' | 'vendor'>('client');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProspect, setSelectedProspect] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [prospectDraft, setProspectDraft] = useState({
    name: '',
    partner: '',
    email: '',
    phone: '',
    address: '',
  });
  const [selectedPrestations, setSelectedPrestations] = useState<string[]>([]);
  const [prestationsPersonnalisees, setPrestationsPersonnalisees] = useState<Array<{nom: string, prix: number}>>([]);
  const [nouvellePrestationNom, setNouvellePrestationNom] = useState('');
  const [nouvellePrestationPrix, setNouvellePrestationPrix] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [adminInfo, setAdminInfo] = useState<AdminInfo>(adminInfoDefault);
  const [contractContent, setContractContent] = useState(contractTemplate);
  const [activeTab, setActiveTab] = useState('form');
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Fetch clients and agency info
  useEffect(() => {
    if (isOpen && user) {
      fetchClients();
      fetchProspects();
      fetchVendors();
      fetchAgencyInfo();
    }
  }, [isOpen, user]);

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
        phone: d.phone || '',
        address: d.address || d.event_location || '',
      }));
      setClients(mapped);
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  const fetchVendors = async () => {
    if (!user) return;
    try {
      const data = await getDocuments('vendors', [
        { field: 'planner_id', operator: '==', value: user.uid },
      ]);
      const mapped = (data as any[])
        .map((v) => ({
          id: v.id,
          name: v.name || v.vendorName || v.title || '',
          email: v.email || '',
          phone: v.phone || '',
          address: v.address || '',
          siret: v.siret || '',
        }))
        .sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'fr')) as Vendor[];
      setVendors(mapped);
    } catch (e) {
      console.error('Error fetching vendors:', e);
      setVendors([]);
    }
  };

  const fetchAgencyInfo = async () => {
    if (!user) return;
    try {
      const agencyDoc = await getDocument('agency', 'leOuiParfait').catch(() => null);
      if (agencyDoc) {
        const agency: any = agencyDoc;
        setAgencyInfo(agency);
        setAdminInfo({
          nomRepresentant: agency.representative_name || agency.representativeName || agency.name || adminInfoDefault.nomRepresentant,
          adresseAgence: agency.address || adminInfoDefault.adresseAgence,
          siret: agency.siret || adminInfoDefault.siret,
          ville: agency.city || adminInfoDefault.ville,
          email: agency.email || adminInfoDefault.email,
          telephone: agency.phone || adminInfoDefault.telephone,
        });
        return;
      }

      const data = await getDocuments('agencies', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      if (data.length > 0) {
        const agency = data[0] as any;
        setAgencyInfo(agency);
        setAdminInfo({
          nomRepresentant: agency.representative_name || agency.name || adminInfoDefault.nomRepresentant,
          adresseAgence: agency.address || adminInfoDefault.adresseAgence,
          siret: agency.siret || adminInfoDefault.siret,
          ville: agency.city || adminInfoDefault.ville,
          email: agency.email || adminInfoDefault.email,
          telephone: agency.phone || adminInfoDefault.telephone,
        });
      }
    } catch (e) {
      console.error('Error fetching agency info:', e);
    }
  };

  const fetchProspects = async () => {
    try {
      const data = await getDocuments('prospects', [{ field: 'archived', operator: '==', value: false }]);
      const mapped = (data as any[])
        .map((p) => ({
          id: p.id,
          name: p.name || '',
          partner: p.partner || '',
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
        }))
        .sort((a, b) => `${a.name} ${a.partner}`.trim().localeCompare(`${b.name} ${b.partner}`.trim(), 'fr')) as Prospect[];
      setProspects(mapped);
    } catch (e) {
      console.error('Error fetching prospects:', e);
      setProspects([]);
    }
  };

  const calculerMontantTotal = () => {
    const montantPrestations = selectedPrestations.reduce((total, id) => {
      const prestation = prestationsDisponibles.find(p => p.id === id);
      return total + (prestation?.prix || 0);
    }, 0);
    
    const montantPersonnalisees = prestationsPersonnalisees.reduce((total, p) => total + p.prix, 0);
    
    return montantPrestations + montantPersonnalisees;
  };

  const ajouterPrestationPersonnalisee = () => {
    if (nouvellePrestationNom && nouvellePrestationPrix) {
      setPrestationsPersonnalisees([...prestationsPersonnalisees, {
        nom: nouvellePrestationNom,
        prix: parseFloat(nouvellePrestationPrix)
      }]);
      setNouvellePrestationNom('');
      setNouvellePrestationPrix('');
    }
  };

  const supprimerPrestationPersonnalisee = (index: number) => {
    setPrestationsPersonnalisees(prestationsPersonnalisees.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (recipientType === 'prospect') {
      const p = prospects.find((x) => x.id === selectedProspect) || null;
      if (p) {
        setProspectDraft({
          name: p.name || '',
          partner: p.partner || '',
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
        });
      }
    }
  }, [recipientType, selectedProspect, prospects]);

  useEffect(() => {
    if (recipientType === 'client') {
      if (selectedClient && eventDate && eventLocation) generateContract();
    } else if (recipientType === 'prospect') {
      if (selectedProspect && eventDate && eventLocation) generateContract();
    } else {
      if (selectedVendor && eventDate && eventLocation) generateContract();
    }
  }, [recipientType, selectedClient, selectedProspect, prospectDraft, eventDate, eventLocation, selectedPrestations, prestationsPersonnalisees, adminInfo]);

  const generateContract = (): string | null => {
    if (!eventDate || !eventLocation) {
      return null;
    }

    const party = (() => {
      if (recipientType === 'client') {
        const client = clients.find((c) => c.id === selectedClient) || null;
        if (!client) return null;
        return {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          kind: 'client' as const,
        };
      }

      if (recipientType === 'vendor') {
        const vendor = vendors.find((v) => v.id === selectedVendor) || null;
        if (!vendor) return null;
        return {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email || '',
          phone: vendor.phone || '',
          address: vendor.address || '',
          siret: vendor.siret || '',
          kind: 'vendor' as const,
        };
      }

      if (!selectedProspect) return null;
      const fullName = `${prospectDraft.name || ''}${prospectDraft.partner ? ' & ' + prospectDraft.partner : ''}`.trim();
      return {
        id: selectedProspect,
        name: fullName || 'Prospect',
        email: prospectDraft.email || '',
        phone: prospectDraft.phone || '',
        address: prospectDraft.address || '',
        kind: 'prospect' as const,
      };
    })();

    if (!party) return null;

    const montantTotal = calculerMontantTotal();
    const acompte = (montantTotal * 0.3).toFixed(2);
    const secondPaiement = (montantTotal * 0.4).toFixed(2);
    const solde = (montantTotal * 0.3).toFixed(2);
    const today = new Date().toLocaleDateString('fr-FR');
    
    const eventDateObj = new Date(eventDate);
    const dateSolde = new Date(eventDateObj);
    dateSolde.setDate(dateSolde.getDate() - 15);
    
    const dateSecondPaiement = new Date(eventDateObj);
    dateSecondPaiement.setMonth(dateSecondPaiement.getMonth() - 2);
    
    const dateFinContrat = new Date(eventDateObj);
    dateFinContrat.setDate(dateFinContrat.getDate() + 7);
    
    const prestationsList: string[] = [];
    
    selectedPrestations.forEach(id => {
      const prestation = prestationsDisponibles.find(p => p.id === id);
      if (prestation) {
        prestationsList.push(`- ${prestation.nom} : ${prestation.prix.toLocaleString('fr-FR')} € TTC`);
      }
    });
    
    prestationsPersonnalisees.forEach(p => {
      prestationsList.push(`- ${p.nom} : ${p.prix.toLocaleString('fr-FR')} € TTC`);
    });
    
    const prestationsText = prestationsList.length > 0 
      ? prestationsList.join('\n')
      : '- Coordination complète du mariage : à définir';

    if (party.kind === 'vendor') {
      const vendorTpl = vendorContractTemplate
        .replace(/\[NOM_REPRESENTANT\]/g, adminInfo.nomRepresentant)
        .replace(/\[ADRESSE_AGENCE\]/g, adminInfo.adresseAgence)
        .replace(/\[SIRET_AGENCE\]/g, adminInfo.siret)
        .replace(/\[EMAIL_AGENCE\]/g, adminInfo.email)
        .replace(/\[TELEPHONE_AGENCE\]/g, adminInfo.telephone)
        .replace(/\[NOM_PRESTATAIRE\]/g, party.name)
        .replace(/\[EMAIL_PRESTATAIRE\]/g, party.email)
        .replace(/\[TELEPHONE_PRESTATAIRE\]/g, party.phone)
        .replace(/\[ADRESSE_PRESTATAIRE\]/g, party.address)
        .replace(/\[SIRET_PRESTATAIRE\]/g, String((party as any)?.siret || ''))
        .replace(/\[DATE_MARIAGE\]/g, eventDateObj.toLocaleDateString('fr-FR'))
        .replace(/\[LIEU_MARIAGE\]/g, eventLocation)
        .replace(/\[PRESTATIONS\]/g, prestationsText)
        .replace(/\[MONTANT_TOTAL\]/g, montantTotal.toLocaleString('fr-FR'))
        .replace(/\[VILLE\]/g, adminInfo.ville)
        .replace(/\[DATE_SIGNATURE\]/g, today);

      setContractContent(vendorTpl);
      return vendorTpl;
    }
    
    let generated = contractTemplate
      .replace(/\[NOM_REPRESENTANT\]/g, adminInfo.nomRepresentant)
      .replace(/\[ADRESSE_AGENCE\]/g, adminInfo.adresseAgence)
      .replace(/\[SIRET_AGENCE\]/g, adminInfo.siret)
      .replace(/\[EMAIL_AGENCE\]/g, adminInfo.email)
      .replace(/\[TELEPHONE_AGENCE\]/g, adminInfo.telephone)
      .replace(/\[NOM_CLIENT\]/g, party.name)
      .replace(/\[EMAIL_CLIENT\]/g, party.email)
      .replace(/\[TELEPHONE_CLIENT\]/g, party.phone)
      .replace(/\[ADRESSE_CLIENT\]/g, party.address)
      .replace(/\[DATE_MARIAGE\]/g, eventDateObj.toLocaleDateString('fr-FR'))
      .replace(/\[LIEU_MARIAGE\]/g, eventLocation)
      .replace(/\[PRESTATIONS\]/g, prestationsText)
      .replace(/\[MONTANT_TOTAL\]/g, montantTotal.toLocaleString('fr-FR'))
      .replace(/\[MONTANT_ACOMPTE\]/g, parseFloat(acompte).toLocaleString('fr-FR'))
      .replace(/\[MONTANT_SECOND\]/g, parseFloat(secondPaiement).toLocaleString('fr-FR'))
      .replace(/\[MONTANT_SOLDE\]/g, parseFloat(solde).toLocaleString('fr-FR'))
      .replace(/\[DATE_SECOND_PAIEMENT\]/g, dateSecondPaiement.toLocaleDateString('fr-FR'))
      .replace(/\[DATE_SOLDE\]/g, dateSolde.toLocaleDateString('fr-FR'))
      .replace(/\[DATE_FIN_CONTRAT\]/g, dateFinContrat.toLocaleDateString('fr-FR'))
      .replace(/\[VILLE\]/g, adminInfo.ville)
      .replace(/\[DATE_SIGNATURE\]/g, today)
      .replace(/\[NOM_ASSURANCE\]/g, 'AXA Assurances Professionnelles');

    setContractContent(generated);
    return generated;
  };

  const generatePdf = async (reference: string): Promise<Blob> => {
    if (!previewRef.current) {
      throw new Error('Preview introuvable pour la génération PDF');
    }

    const { default: html2canvas } = await import('html2canvas');

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const padding = 24;

    const node = previewRef.current;

    const scale = 1.25;
    const quality = 0.75;
    const totalHeight = node.scrollHeight;
    const imgWidth = pageWidth - padding * 2;

    // Hauteur disponible dans le PDF (en points)
    const pdfInnerHeight = pageHeight - padding * 2;
    // Conversion px->pt basée sur la largeur : node.scrollWidth(px) -> imgWidth(pt)
    const ptPerPx = imgWidth / Math.max(1, node.scrollWidth);
    // Hauteur max (px) d'un slice pour rentrer dans une page PDF
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
    if (!user || !eventDate || !eventLocation) {
      sonnerToast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (recipientType === 'client' && !selectedClient) {
      sonnerToast.error('Veuillez sélectionner un client');
      return;
    }
    if (recipientType === 'prospect' && (!selectedProspect || !prospectDraft.name.trim())) {
      sonnerToast.error('Veuillez sélectionner un prospect et renseigner son nom');
      return;
    }
    if (recipientType === 'vendor' && !selectedVendor) {
      sonnerToast.error('Veuillez sélectionner un prestataire');
      return;
    }

    setLoading(true);
    try {
      const generatedContent = generateContract();
      if (!generatedContent) {
        sonnerToast.error('Impossible de générer le contrat');
        return;
      }

      const client = recipientType === 'client' ? clients.find((c) => c.id === selectedClient) : null;
      const vendor = recipientType === 'vendor' ? vendors.find((v) => v.id === selectedVendor) : null;
      const prospectName = recipientType === 'prospect'
        ? `${prospectDraft.name || ''}${prospectDraft.partner ? ' & ' + prospectDraft.partner : ''}`.trim()
        : '';
      const montantTotal = calculerMontantTotal();
      const reference = `CONT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      
      const prestationsList: string[] = [];
      selectedPrestations.forEach(id => {
        const prestation = prestationsDisponibles.find(p => p.id === id);
        if (prestation) {
          prestationsList.push(`${prestation.nom} : ${prestation.prix.toLocaleString('fr-FR')} € TTC`);
        }
      });
      prestationsPersonnalisees.forEach(p => {
        prestationsList.push(`${p.nom} : ${p.prix.toLocaleString('fr-FR')} € TTC`);
      });

      // Générer le PDF
      sonnerToast.info('Génération du PDF en cours...');
      const pdfBlob = await generatePdf(reference);
      
      // Upload vers Cloudinary
      sonnerToast.info('Upload du PDF vers le cloud...');
      let pdfUrl = '';
      try {
        pdfUrl = await uploadPdf(pdfBlob, reference);
      } catch (e: any) {
        console.error('Error uploading PDF:', e);
        sonnerToast.error(`Erreur upload PDF: ${e?.message || 'upload impossible'}`);
        return;
      }

      if (recipientType === 'prospect' && selectedProspect) {
        try {
          await updateDocument('prospects', selectedProspect, {
            name: prospectDraft.name,
            partner: prospectDraft.partner,
            email: prospectDraft.email,
            phone: prospectDraft.phone,
            address: prospectDraft.address,
            updatedAt: new Date(),
          });
        } catch (e) {
          console.error('Error updating prospect:', e);
        }
      }

      const contractData = {
        planner_id: user.uid,
        reference,
        title: `Contrat de prestation - ${recipientType === 'client' ? (client?.name || '') : recipientType === 'vendor' ? (vendor?.name || '') : prospectName}`,
        client_id: recipientType === 'client' ? selectedClient : null,
        prospect_id: recipientType === 'prospect' ? selectedProspect : null,
        vendor_id: recipientType === 'vendor' ? selectedVendor : null,
        recipient_type: recipientType,
        client: recipientType === 'client' ? (client?.name || '') : recipientType === 'vendor' ? (vendor?.name || '') : prospectName,
        client_email: recipientType === 'client' ? (client?.email || '') : recipientType === 'vendor' ? (vendor?.email || '') : (prospectDraft.email || ''),
        client_phone: recipientType === 'client' ? (client?.phone || '') : recipientType === 'vendor' ? (vendor?.phone || '') : (prospectDraft.phone || ''),
        client_address: recipientType === 'client' ? (client?.address || '') : recipientType === 'vendor' ? (vendor?.address || '') : (prospectDraft.address || ''),
        type: recipientType === 'vendor' ? 'vendor_contract' : 'service_contract',
        amount: montantTotal,
        status: 'sent',
        created_at: new Date().toLocaleDateString('fr-FR'),
        sent_at: new Date().toLocaleDateString('fr-FR'),
        signed_at: null,
        event_date: eventDate,
        event_location: eventLocation,
        prestations: prestationsList,
        contract_content: generatedContent,
        pdf_url: pdfUrl,
        agency_name: adminInfo.nomRepresentant,
        agency_address: adminInfo.adresseAgence,
        agency_phone: adminInfo.telephone,
        agency_email: adminInfo.email,
        agency_siret: adminInfo.siret,
        created_timestamp: new Date(),
      };

      const createdContract = await addDocument('contracts', contractData);

      // Publier aussi dans la collection documents pour visibilité côté client
      if (recipientType === 'client') {
        try {
          const evts = await getDocuments('events', [{ field: 'client_id', operator: '==', value: selectedClient }]);
          const weddingEvt = ((evts as any[]) || []).find((x) => Boolean(x?.event_date)) || (evts as any[])?.[0] || null;
          await addDocument('documents', {
            planner_id: user.uid,
            client_id: selectedClient,
            event_id: weddingEvt?.id || null,
            name: `Contrat - ${reference}`,
            type: 'contrat',
            file_url: pdfUrl,
            file_type: 'application/pdf',
            uploaded_by: 'planner',
            uploaded_at: new Date().toLocaleDateString('fr-FR'),
            created_timestamp: new Date(),
            contract_id: createdContract?.id || null,
            status: 'sent',
          });
        } catch (e) {
          console.error('Error creating documents entry for contract:', e);
        }
      }
      
      sonnerToast.success(`Contrat créé avec PDF pour ${recipientType === 'client' ? (client?.name || '') : recipientType === 'vendor' ? (vendor?.name || '') : prospectName}`);
      
      // Fermer le modal d'abord
      onClose();
      
      // Puis rafraîchir la liste après un court délai
      if (onContractCreated) {
        setTimeout(() => {
          onContractCreated();
        }, 300);
      }
    } catch (e) {
      console.error('Error creating contract:', e);
      sonnerToast.error('Erreur lors de la création du contrat');
    } finally {
      setLoading(false);
    }
  };

  const selectedClientData = recipientType === 'client'
    ? clients.find((c) => c.id === selectedClient)
    : undefined;

  const montantTotal = calculerMontantTotal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-3">
            <FileText className="h-6 w-6 text-brand-turquoise" />
            Nouveau contrat - {montantTotal > 0 ? `${montantTotal.toLocaleString('fr-FR')} € TTC` : 'Montant à définir'}
          </DialogTitle>
          <DialogDescription>
            Créez un contrat de prestation pour votre client
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Informations</TabsTrigger>
            <TabsTrigger value="preview">Prévisualisation</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6 mt-4">
            {/* Informations Admin */}
            <div className="p-4 bg-brand-beige/30 rounded-lg">
              <h3 className="font-bold text-brand-purple mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations de l'agence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nom du représentant *</Label>
                  <Input
                    value={adminInfo.nomRepresentant}
                    onChange={(e) => setAdminInfo({...adminInfo, nomRepresentant: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>SIRET *</Label>
                  <Input
                    value={adminInfo.siret}
                    onChange={(e) => setAdminInfo({...adminInfo, siret: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Adresse de l'agence *</Label>
                  <Input
                    value={adminInfo.adresseAgence}
                    onChange={(e) => setAdminInfo({...adminInfo, adresseAgence: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Ville *</Label>
                  <Input
                    value={adminInfo.ville}
                    onChange={(e) => setAdminInfo({...adminInfo, ville: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={adminInfo.email}
                    onChange={(e) => setAdminInfo({...adminInfo, email: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input
                    value={adminInfo.telephone}
                    onChange={(e) => setAdminInfo({...adminInfo, telephone: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Informations Client/Prospect et Événement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label>Destinataire *</Label>
              <Select
                value={recipientType}
                onValueChange={(v) => {
                  const next = (v === 'prospect' ? 'prospect' : v === 'vendor' ? 'vendor' : 'client') as 'client' | 'prospect' | 'vendor';
                  setRecipientType(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="vendor">Prestataire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'client' ? (
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
            ) : recipientType === 'vendor' ? (
              <div>
                <Label>Prestataire *</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un prestataire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name || 'Prestataire'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Prospect *</Label>
                <Select value={selectedProspect} onValueChange={setSelectedProspect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un prospect..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prospects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {`${p.name || ''}${p.partner ? ' & ' + p.partner : ''}`.trim() || 'Prospect'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {recipientType === 'prospect' ? (
              <>
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={prospectDraft.name}
                    onChange={(e) => setProspectDraft({ ...prospectDraft, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Nom du/de la partenaire</Label>
                  <Input
                    value={prospectDraft.partner}
                    onChange={(e) => setProspectDraft({ ...prospectDraft, partner: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={prospectDraft.email}
                    onChange={(e) => setProspectDraft({ ...prospectDraft, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={prospectDraft.phone}
                    onChange={(e) => setProspectDraft({ ...prospectDraft, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Adresse</Label>
                  <Input
                    value={prospectDraft.address}
                    onChange={(e) => setProspectDraft({ ...prospectDraft, address: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </>
            ) : null}
            
            <div>
              <Label htmlFor="eventDate">Date du mariage *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="eventLocation">Lieu de l'événement *</Label>
              <Input
                id="eventLocation"
                placeholder="Ex: Château d'Apigné, Rennes"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              />
            </div>

          </div>

            {/* Sélection des Prestations */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-brand-purple mb-3">Prestations proposées</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {prestationsDisponibles.map((prestation) => (
                  <label key={prestation.id} className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPrestations.includes(prestation.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPrestations([...selectedPrestations, prestation.id]);
                        } else {
                          setSelectedPrestations(selectedPrestations.filter(id => id !== prestation.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{prestation.nom}</span>
                      <span className="text-sm text-brand-turquoise font-bold ml-2">{prestation.prix.toLocaleString('fr-FR')} €</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-brand-purple mb-2">Ajouter une prestation personnalisée</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nom de la prestation"
                    value={nouvellePrestationNom}
                    onChange={(e) => setNouvellePrestationNom(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Prix (€)"
                    value={nouvellePrestationPrix}
                    onChange={(e) => setNouvellePrestationPrix(e.target.value)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    onClick={ajouterPrestationPersonnalisee}
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>

              {prestationsPersonnalisees.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-brand-purple mb-2">Prestations personnalisées</h4>
                  <div className="space-y-2">
                    {prestationsPersonnalisees.map((prestation, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
                        <span className="text-sm">{prestation.nom} - {prestation.prix.toLocaleString('fr-FR')} €</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => supprimerPrestationPersonnalisee(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Supprimer
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-brand-turquoise/10 rounded">
                <p className="text-sm font-bold text-brand-purple">
                  Montant total : {montantTotal.toLocaleString('fr-FR')} € TTC
                </p>
                <p className="text-xs text-brand-gray mt-1">
                  Acompte 30% : {(montantTotal * 0.3).toLocaleString('fr-FR')} € | 
                  Second versement 40% : {(montantTotal * 0.4).toLocaleString('fr-FR')} € | 
                  Solde 30% : {(montantTotal * 0.3).toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={() => {
                  generateContract();
                  setActiveTab('preview');
                }}
                disabled={
                  recipientType === 'client'
                    ? !selectedClient || !eventDate || !eventLocation
                    : recipientType === 'vendor'
                      ? !selectedVendor || !eventDate || !eventLocation
                      : !selectedProspect || !eventDate || !eventLocation || !prospectDraft.name.trim()
                }
              >
                <Eye className="h-4 w-4" />
                Voir la prévisualisation
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="w-full overflow-x-auto">
              <div
                ref={previewRef}
                className="bg-white border-2 border-gray-200 rounded-lg shadow-lg mx-auto"
                style={{ width: 794, minHeight: 1123 }}
              >
                <div className="p-10">
                  <div className="flex justify-center mb-6">
                    <Image
                      src="/logo-horizontal.png"
                      alt="Le Oui Parfait"
                      width={200}
                      height={60}
                      className="object-contain"
                    />
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                      {contractContent}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t-2 border-gray-300 grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <p className="font-bold text-brand-purple mb-4">Signature du Prestataire</p>
                      <div className="border-2 border-dashed border-gray-300 h-24 rounded flex items-center justify-center">
                        <p className="text-xs text-gray-400">Zone de signature</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Le Oui Parfait</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-brand-purple mb-4">Signature du Client</p>
                      <div className="border-2 border-dashed border-gray-300 h-24 rounded flex items-center justify-center">
                        <p className="text-xs text-gray-400">Zone de signature</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{selectedClientData?.name}</p>
                    </div>
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
            disabled={
              loading ||
              !eventDate ||
              !eventLocation ||
              (recipientType === 'client'
                ? !selectedClient
                : recipientType === 'vendor'
                  ? !selectedVendor
                  : !selectedProspect || !prospectDraft.name.trim())
            }
          >
            {loading ? 'Création...' : 'Créer et envoyer au client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
