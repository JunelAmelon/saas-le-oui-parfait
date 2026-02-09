'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Plus,
  Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  name: string;
  type: 'client' | 'vendor' | 'team';
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  isMe: boolean;
  read: boolean;
}

const conversations: Conversation[] = [
  {
    id: '1',
    name: 'Julie & Frédérick',
    type: 'client',
    avatar: 'JF',
    lastMessage: 'Merci pour les informations sur le fleuriste !',
    time: 'Il y a 30min',
    unread: 1,
    online: true,
  },
  {
    id: '2',
    name: 'Sophie & Alexandre',
    type: 'client',
    avatar: 'SA',
    lastMessage: 'On a validé le menu avec le traiteur',
    time: 'Il y a 2h',
    unread: 0,
    online: false,
  },
  {
    id: '3',
    name: 'Château d\'Apigné',
    type: 'vendor',
    avatar: 'CH',
    lastMessage: 'La salle est disponible pour la date souhaitée',
    time: 'Hier',
    unread: 2,
    online: true,
  },
  {
    id: '4',
    name: 'Studio Photo Lumière',
    type: 'vendor',
    avatar: 'SP',
    lastMessage: 'Voici le devis mis à jour',
    time: 'Hier',
    unread: 0,
    online: false,
  },
  {
    id: '5',
    name: 'Marie - Assistante',
    type: 'team',
    avatar: 'MA',
    lastMessage: 'J\'ai finalisé le planning du mariage Dubois',
    time: '2 jours',
    unread: 0,
    online: true,
  },
];

const messagesData: Message[] = [
  {
    id: '1',
    sender: 'Julie',
    content: 'Bonjour Caroline ! On voulait vous remercier pour le RDV avec le fleuriste, c\'était super !',
    time: '10:30',
    isMe: false,
    read: true,
  },
  {
    id: '2',
    sender: 'Moi',
    content: 'Bonjour Julie ! Je suis ravie que ça vous ait plu. Avez-vous fait votre choix pour les compositions ?',
    time: '10:35',
    isMe: true,
    read: true,
  },
  {
    id: '3',
    sender: 'Julie',
    content: 'Oui ! On a adoré les pivoines blanches avec les touches de rose poudré. C\'est exactement ce qu\'on imaginait.',
    time: '10:40',
    isMe: false,
    read: true,
  },
  {
    id: '4',
    sender: 'Moi',
    content: 'Excellent choix ! Je vais confirmer avec le fleuriste et vous envoyer le devis définitif cette semaine.',
    time: '10:45',
    isMe: true,
    read: true,
  },
  {
    id: '5',
    sender: 'Julie',
    content: 'Merci pour les informations sur le fleuriste !',
    time: '14:30',
    isMe: false,
    read: false,
  },
];

const typeConfig = {
  client: { label: 'Client', color: 'bg-brand-turquoise' },
  vendor: { label: 'Prestataire', color: 'bg-purple-500' },
  team: { label: 'Équipe', color: 'bg-green-500' },
};

export default function AdminMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversations[0]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'client' | 'vendor' | 'team'>('all');

  const filteredConversations = conversations.filter(conv => 
    filter === 'all' || conv.type === filter
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Messagerie
              {totalUnread > 0 && (
                <Badge className="bg-red-500 text-white">{totalUnread}</Badge>
              )}
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Communiquez avec vos clients et prestataires
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle conversation</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          {/* Liste des conversations */}
          <Card className="p-4 shadow-xl border-0 overflow-hidden flex flex-col">
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
                <Input placeholder="Rechercher..." className="pl-10" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'bg-brand-turquoise' : ''}
                >
                  Tous
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'client' ? 'default' : 'outline'}
                  onClick={() => setFilter('client')}
                  className={filter === 'client' ? 'bg-brand-turquoise' : ''}
                >
                  Clients
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'vendor' ? 'default' : 'outline'}
                  onClick={() => setFilter('vendor')}
                  className={filter === 'vendor' ? 'bg-brand-turquoise' : ''}
                >
                  Prestataires
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'team' ? 'default' : 'outline'}
                  onClick={() => setFilter('team')}
                  className={filter === 'team' ? 'bg-brand-turquoise' : ''}
                >
                  Équipe
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation.id === conv.id
                      ? 'bg-brand-turquoise/10 border-l-4 border-brand-turquoise'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`${typeConfig[conv.type].color} text-white text-sm`}>
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-brand-purple text-sm truncate">
                          {conv.name}
                        </p>
                        <span className="text-xs text-brand-gray whitespace-nowrap ml-2">{conv.time}</span>
                      </div>
                      <p className="text-xs text-brand-gray">{typeConfig[conv.type].label}</p>
                      <p className="text-sm text-brand-gray truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="bg-brand-turquoise text-white text-xs px-2 flex-shrink-0">
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Zone de chat */}
          <Card className="lg:col-span-2 shadow-xl border-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`${typeConfig[selectedConversation.type].color} text-white`}>
                    {selectedConversation.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-brand-purple">
                    {selectedConversation.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={`${typeConfig[selectedConversation.type].color} text-white text-xs`}>
                      {typeConfig[selectedConversation.type].label}
                    </Badge>
                    <span className="text-xs text-brand-gray">
                      {selectedConversation.online ? '● En ligne' : '○ Hors ligne'}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4 text-brand-gray" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesData.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-lg ${
                      message.isMe
                        ? 'bg-brand-turquoise text-white rounded-br-none'
                        : 'bg-gray-100 text-brand-purple rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      message.isMe ? 'text-white/70' : 'text-brand-gray'
                    }`}>
                      <span className="text-xs">{message.time}</span>
                      {message.isMe && (
                        message.read ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Paperclip className="h-4 w-4 text-brand-gray" />
                </Button>
                <Input
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      setNewMessage('');
                    }
                  }}
                />
                <Button 
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
