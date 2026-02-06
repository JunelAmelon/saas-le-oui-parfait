'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Users, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const clients = [
  { id: '1', name: 'Julie & Frédérick', email: 'julie.martin@email.com', type: 'client' },
  { id: '2', name: 'Sophie & Alexandre', email: 'sophie.dubois@email.com', type: 'client' },
  { id: '3', name: 'Emma & Thomas', email: 'emma.bernard@email.com', type: 'client' },
];

const prospects = [
  { id: '4', name: 'Marie Dupont', email: 'marie.dupont@email.com', type: 'prospect' },
  { id: '5', name: 'Pierre Martin', email: 'pierre.martin@email.com', type: 'prospect' },
  { id: '6', name: 'Claire Bernard', email: 'claire.bernard@email.com', type: 'prospect' },
  { id: '7', name: 'Lucas Durand', email: 'lucas.durand@email.com', type: 'prospect' },
];

export function CampaignModal({ isOpen, onClose }: CampaignModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const allContacts = [...clients, ...prospects];

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmails(allContacts.map(c => c.id));
    } else {
      setSelectedEmails([]);
    }
  };

  const handleToggleEmail = (id: string) => {
    if (selectedEmails.includes(id)) {
      setSelectedEmails(selectedEmails.filter(e => e !== id));
    } else {
      setSelectedEmails([...selectedEmails, id]);
    }
  };

  const handleSubmit = () => {
    if (!name || !subject) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    if (selectedEmails.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un destinataire',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Campagne créée',
      description: `La campagne "${name}" a été créée avec ${selectedEmails.length} destinataire(s)`,
    });

    setName('');
    setSubject('');
    setContent('');
    setSelectedEmails([]);
    setSelectAll(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-turquoise" />
            Nouvelle campagne email
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle campagne et sélectionnez vos destinataires
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-brand-beige/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-turquoise" />
              <span className="font-medium text-brand-purple">
                {selectedEmails.length} destinataire(s) sélectionné(s)
              </span>
            </div>
            <Badge variant="outline" className="border-brand-turquoise text-brand-turquoise">
              {selectedEmails.filter(id => clients.find(c => c.id === id)).length} clients + {selectedEmails.filter(id => prospects.find(p => p.id === id)).length} prospects
            </Badge>
          </div>
          <div>
            <Label>Nom de la campagne *</Label>
            <Input
              placeholder="Ex: Newsletter Janvier 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-brand-gray mt-1">
              Ce nom est uniquement visible par vous
            </p>
          </div>

          <div>
            <Label>Objet de l'email *</Label>
            <Input
              placeholder="Ex: Les tendances mariage 2024"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-brand-gray mt-1">
              L'objet que vos destinataires verront
            </p>
          </div>

          <div>
            <Label>Contenu de l'email (optionnel)</Label>
            <Textarea
              placeholder="Vous pourrez éditer le contenu complet après la création..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>

          <div>
            <Label className="mb-3 block">Destinataires *</Label>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="prospects">Prospects</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-2 mt-3">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="cursor-pointer font-semibold">Sélectionner tous les contacts</Label>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {allContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        checked={selectedEmails.includes(contact.id)}
                        onCheckedChange={() => handleToggleEmail(contact.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-xs text-gray-500">{contact.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {contact.type === 'client' ? <UserCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="clients" className="space-y-1 mt-3 max-h-48 overflow-y-auto border rounded p-2">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      checked={selectedEmails.includes(client.id)}
                      onCheckedChange={() => handleToggleEmail(client.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.email}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="prospects" className="space-y-1 mt-3 max-h-48 overflow-y-auto border rounded p-2">
                {prospects.map((prospect) => (
                  <div key={prospect.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      checked={selectedEmails.includes(prospect.id)}
                      onCheckedChange={() => handleToggleEmail(prospect.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{prospect.name}</p>
                      <p className="text-xs text-gray-500">{prospect.email}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
          >
            Créer la campagne
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
