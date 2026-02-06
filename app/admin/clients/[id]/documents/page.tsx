'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, Download, Eye, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const documentsDemo = [
  {
    id: '1',
    name: 'Contrat de prestation.pdf',
    type: 'Contrat',
    size: '245 KB',
    uploadedAt: '15/01/2024',
    uploadedBy: 'Admin',
  },
  {
    id: '2',
    name: 'Devis détaillé.pdf',
    type: 'Devis',
    size: '189 KB',
    uploadedAt: '10/01/2024',
    uploadedBy: 'Admin',
  },
  {
    id: '3',
    name: 'Plan de salle.jpg',
    type: 'Plan',
    size: '1.2 MB',
    uploadedAt: '20/01/2024',
    uploadedBy: 'Client',
  },
];

export default function ClientDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = documentsDemo.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            ← Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-brand-purple">
              Documents - Client #{params.id}
            </h1>
            <p className="text-brand-gray">
              Gérez les documents du client
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un document..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
            <Upload className="h-4 w-4" />
            Ajouter un document
          </Button>
        </div>

        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="p-6 shadow-xl border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-beige/20 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-brand-turquoise" />
                  </div>
                  <div>
                    <h3 className="font-medium text-brand-purple">{doc.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-brand-gray mt-1">
                      <Badge variant="outline">{doc.type}</Badge>
                      <span>{doc.size}</span>
                      <span>Ajouté le {doc.uploadedAt}</span>
                      <span>par {doc.uploadedBy}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Voir
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
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
