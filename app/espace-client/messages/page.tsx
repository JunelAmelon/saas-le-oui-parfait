'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useState } from 'react';

const conversations = [
  {
    id: '1',
    name: 'Caroline - Wedding Planner',
    role: 'Wedding Planner',
    avatar: 'CA',
    lastMessage: 'J\'ai confirmé votre RDV avec le fleuriste pour le 20 février',
    time: 'Il y a 2h',
    unread: 2,
    online: true,
  },
  {
    id: '2',
    name: 'Château d\'Apigné',
    role: 'Lieu de réception',
    avatar: 'CH',
    lastMessage: 'Merci pour votre confirmation. À bientôt !',
    time: 'Hier',
    unread: 0,
    online: false,
  },
  {
    id: '3',
    name: 'Studio Photo Lumière',
    role: 'Photographe',
    avatar: 'SP',
    lastMessage: 'Voici quelques exemples de notre travail',
    time: '3 jours',
    unread: 0,
    online: false,
  },
];

const messages = [
  {
    id: '1',
    sender: 'Caroline',
    content: 'Bonjour Julie et Frédérick ! J\'espère que vous allez bien. Je voulais faire le point avec vous sur les préparatifs.',
    time: '10:30',
    isMe: false,
    read: true,
  },
  {
    id: '2',
    sender: 'Moi',
    content: 'Bonjour Caroline ! Oui très bien merci. On est très excités par les préparatifs !',
    time: '10:35',
    isMe: true,
    read: true,
  },
  {
    id: '3',
    sender: 'Caroline',
    content: 'Super ! J\'ai une bonne nouvelle : le fleuriste a confirmé la date du rendez-vous pour la dégustation. Ce sera le 20 février à 14h.',
    time: '10:40',
    isMe: false,
    read: true,
  },
  {
    id: '4',
    sender: 'Moi',
    content: 'Parfait ! On sera là. Est-ce qu\'on doit amener quelque chose de particulier ?',
    time: '10:45',
    isMe: true,
    read: true,
  },
  {
    id: '5',
    sender: 'Caroline',
    content: 'Non, rien de spécial. Juste vos idées et inspirations si vous en avez. J\'ai aussi mis à jour votre planning avec ce nouveau RDV.',
    time: '11:00',
    isMe: false,
    read: true,
  },
  {
    id: '6',
    sender: 'Caroline',
    content: 'J\'ai confirmé votre RDV avec le fleuriste pour le 20 février. N\'hésitez pas si vous avez des questions !',
    time: '14:30',
    isMe: false,
    read: false,
  },
];

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState('');

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-purple flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-brand-turquoise" />
            Messages
          </h1>
          <p className="text-brand-gray mt-1">
            Communiquez avec votre wedding planner et vos prestataires
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          <Card className="p-4 shadow-xl border-0 overflow-hidden flex flex-col">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
                <Input placeholder="Rechercher..." className="pl-10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.map((conv) => (
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
                        <AvatarFallback className="bg-brand-turquoise text-white text-sm">
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
                        <span className="text-xs text-brand-gray">{conv.time}</span>
                      </div>
                      <p className="text-xs text-brand-gray">{conv.role}</p>
                      <p className="text-sm text-brand-gray truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="bg-brand-turquoise text-white text-xs px-2">
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2 shadow-xl border-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-brand-turquoise text-white">
                    {selectedConversation.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-brand-purple">
                    {selectedConversation.name}
                  </p>
                  <p className="text-xs text-brand-gray">
                    {selectedConversation.online ? 'En ligne' : 'Hors ligne'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4 text-brand-gray" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
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
                <Button variant="ghost" size="icon">
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
    </ClientDashboardLayout>
  );
}
