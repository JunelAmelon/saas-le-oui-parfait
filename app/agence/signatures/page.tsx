import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, CheckCircle, Clock, Send, User, Mail, Calendar } from 'lucide-react';

const signaturesDemo = [
  {
    id: '1',
    contractRef: 'CONT-2024-001',
    contractTitle: 'Contrat de prestation Wedding Planning',
    client: 'Julie Martin',
    email: 'julie.martin@email.com',
    status: 'signed',
    sentAt: '20/01/2024 14:30',
    signedAt: '20/01/2024 16:45',
    ipAddress: '192.168.1.100',
  },
  {
    id: '2',
    contractRef: 'CONT-2024-002',
    contractTitle: 'Contrat Château d\'Apigné',
    client: 'Frédérick Dubois',
    email: 'frederick.dubois@email.com',
    status: 'pending',
    sentAt: '18/01/2024 10:15',
    signedAt: null,
    ipAddress: null,
  },
  {
    id: '3',
    contractRef: 'CONT-2024-003',
    contractTitle: 'Contrat de prestation Wedding Planning',
    client: 'Sophie Bernard',
    email: 'sophie.bernard@email.com',
    status: 'signed',
    sentAt: '25/01/2024 09:00',
    signedAt: '25/01/2024 11:20',
    ipAddress: '192.168.1.105',
  },
  {
    id: '4',
    contractRef: 'CONT-2024-003',
    contractTitle: 'Contrat de prestation Wedding Planning',
    client: 'Alexandre Petit',
    email: 'alexandre.petit@email.com',
    status: 'signed',
    sentAt: '25/01/2024 09:00',
    signedAt: '25/01/2024 14:30',
    ipAddress: '192.168.1.108',
  },
  {
    id: '5',
    contractRef: 'CONT-2024-005',
    contractTitle: 'Contrat de prestation Wedding Planning',
    client: 'Emma Moreau',
    email: 'emma.moreau@email.com',
    status: 'signed',
    sentAt: '08/02/2024 15:00',
    signedAt: '08/02/2024 17:10',
    ipAddress: '192.168.1.112',
  },
];

export default function SignaturesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Signatures électroniques
            </h1>
            <p className="text-brand-gray">
              Suivez l'état des signatures de vos contrats
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-gray uppercase tracking-label mb-1">
                  Signés
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {signaturesDemo.filter(s => s.status === 'signed').length}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-gray uppercase tracking-label mb-1">
                  En attente
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {signaturesDemo.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-gray uppercase tracking-label mb-1">
                  Total
                </p>
                <p className="text-3xl font-bold text-brand-purple">
                  {signaturesDemo.length}
                </p>
              </div>
              <FileSignature className="h-12 w-12 text-brand-turquoise" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {signaturesDemo.map((signature) => (
            <Card key={signature.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileSignature className="h-5 w-5 text-brand-turquoise" />
                    <h3 className="text-lg font-bold text-brand-purple">
                      {signature.contractTitle}
                    </h3>
                  </div>
                  <p className="text-sm text-brand-gray">
                    Référence: {signature.contractRef}
                  </p>
                </div>

                {signature.status === 'signed' ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Signé
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Clock className="h-3 w-3 mr-1" />
                    En attente
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 text-brand-gray">
                  <User className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs uppercase tracking-label">Signataire</p>
                    <p className="font-medium text-brand-purple">
                      {signature.client}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-brand-gray">
                  <Mail className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs uppercase tracking-label">Email</p>
                    <p className="font-medium text-brand-purple">
                      {signature.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-brand-gray">
                  <Send className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs uppercase tracking-label">Envoyé le</p>
                    <p className="font-medium text-brand-purple">
                      {signature.sentAt}
                    </p>
                  </div>
                </div>

                {signature.signedAt && (
                  <div className="flex items-center gap-3 text-brand-gray">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xs uppercase tracking-label">Signé le</p>
                      <p className="font-medium text-green-600">
                        {signature.signedAt}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {signature.status === 'signed' && signature.ipAddress && (
                <div className="pt-3 border-t border-[#E5E5E5]">
                  <p className="text-xs text-brand-gray">
                    Adresse IP: {signature.ipAddress}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {signature.status === 'pending' ? (
                  <Button
                    size="sm"
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                  >
                    <Send className="h-3 w-3" />
                    Renvoyer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                  >
                    Télécharger le certificat
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
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
