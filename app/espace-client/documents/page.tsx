'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  File,
  FileCheck,
  FilePen,
  Clock,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  date: string;
  status: string;
  size: string;
}

const documents = [
  {
    id: '1',
    name: 'Contrat de prestation Wedding Planner',
    type: 'Contrat',
    category: 'contrat',
    date: '20/01/2024',
    status: 'signed',
    size: '245 Ko',
  },
  {
    id: '2',
    name: 'Devis traiteur - Menu Prestige',
    type: 'Devis',
    category: 'devis',
    date: '22/01/2024',
    status: 'accepted',
    size: '180 Ko',
  },
  {
    id: '3',
    name: 'Facture acompte - Château d\'Apigné',
    type: 'Facture',
    category: 'facture',
    date: '25/01/2024',
    status: 'paid',
    size: '120 Ko',
  },
  {
    id: '4',
    name: 'Devis photographe - Pack Premium',
    type: 'Devis',
    category: 'devis',
    date: '28/01/2024',
    status: 'accepted',
    size: '156 Ko',
  },
  {
    id: '5',
    name: 'Planning jour J - Version 1',
    type: 'Planning',
    category: 'planning',
    date: '01/02/2024',
    status: 'draft',
    size: '89 Ko',
  },
  {
    id: '6',
    name: 'Contrat DJ - Animation soirée',
    type: 'Contrat',
    category: 'contrat',
    date: '05/02/2024',
    status: 'pending',
    size: '198 Ko',
  },
  {
    id: '7',
    name: 'Devis fleuriste - Décoration complète',
    type: 'Devis',
    category: 'devis',
    date: '10/02/2024',
    status: 'pending',
    size: '210 Ko',
  },
  {
    id: '8',
    name: 'Facture photographe - Acompte 30%',
    type: 'Facture',
    category: 'facture',
    date: '12/02/2024',
    status: 'paid',
    size: '95 Ko',
  },
];

const categories = [
  { id: 'all', label: 'Tous', count: documents.length },
  { id: 'contrat', label: 'Contrats', count: documents.filter(d => d.category === 'contrat').length },
  { id: 'devis', label: 'Devis', count: documents.filter(d => d.category === 'devis').length },
  { id: 'facture', label: 'Factures', count: documents.filter(d => d.category === 'facture').length },
  { id: 'planning', label: 'Planning', count: documents.filter(d => d.category === 'planning').length },
];

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setIsPreviewOpen(true);
  };

  const handleDownload = (doc: Document) => {
    setSelectedDocument(doc);
    setIsDownloadSuccess(true);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-700">Signé</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-100 text-blue-700">Accepté</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">En attente</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700">Brouillon</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Contrat':
        return <FileCheck className="h-5 w-5 text-brand-turquoise" />;
      case 'Devis':
        return <FilePen className="h-5 w-5 text-blue-500" />;
      case 'Facture':
        return <File className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-brand-gray" />;
    }
  };

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple flex items-center gap-3">
              <FileText className="h-8 w-8 text-brand-turquoise" />
              Mes Documents
            </h1>
            <p className="text-brand-gray mt-1">
              Tous vos documents au même endroit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-turquoise text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <p className={`text-2xl font-bold ${selectedCategory === cat.id ? 'text-white' : 'text-brand-purple'}`}>
                {cat.count}
              </p>
              <p className={`text-sm ${selectedCategory === cat.id ? 'text-white/80' : 'text-brand-gray'}`}>
                {cat.label}
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
              <Input
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
          </div>

          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getTypeIcon(doc.type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-brand-purple">{doc.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-brand-gray">
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.date}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(doc.status)}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handlePreview(doc as Document)}
                  >
                    <Eye className="h-4 w-4 text-brand-gray" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDownload(doc as Document)}
                  >
                    <Download className="h-4 w-4 text-brand-turquoise" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-brand-gray mx-auto mb-4" />
              <p className="text-brand-gray">Aucun document trouvé</p>
            </div>
          )}
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-brand-purple flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-turquoise" />
                {selectedDocument?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedDocument?.type} • {selectedDocument?.date} • {selectedDocument?.size}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-100 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-brand-gray mx-auto mb-4" />
                  <p className="text-brand-gray">Aperçu du document</p>
                  <p className="text-sm text-brand-gray mt-2">
                    Le document s'afficherait ici dans une version complète
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Fermer
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={() => {
                  setIsPreviewOpen(false);
                  handleDownload(selectedDocument!);
                }}
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDownloadSuccess} onOpenChange={setIsDownloadSuccess}>
          <DialogContent className="sm:max-w-md text-center">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-brand-purple text-xl">Téléchargement lancé !</DialogTitle>
              <DialogDescription className="mt-2">
                Le document "{selectedDocument?.name}" est en cours de téléchargement.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => setIsDownloadSuccess(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}
