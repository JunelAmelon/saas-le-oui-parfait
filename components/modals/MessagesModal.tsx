'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Search } from 'lucide-react';
import { useState } from 'react';

interface MessagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessagesModal({ open, onOpenChange }: MessagesModalProps) {
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const conversations = [
    { id: '1', name: 'Julie Martin', lastMsg: 'Merci pour votre retour!', time: '10:30', unread: 2 },
    { id: '2', name: 'Marc Dubois', lastMsg: 'Question sur le devis', time: 'Hier', unread: 0 },
    { id: '3', name: 'Sophie Laurent', lastMsg: 'Rendez-vous confirmé', time: '15/01', unread: 1 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0">
        <div className="flex h-[85vh]">
          <div className="w-96 border-r flex flex-col bg-white">
            <DialogHeader className="p-6 border-b">
              <DialogTitle className="text-2xl font-bold text-brand-purple">
                Messages
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Rechercher..." className="pl-10" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedConv === conv.id ? 'bg-brand-turquoise/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-brand-turquoise text-white">
                        {conv.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-brand-purple">{conv.name}</p>
                        {conv.unread > 0 && (
                          <span className="bg-brand-turquoise text-white text-xs px-2 py-1 rounded-full">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{conv.lastMsg}</p>
                      <p className="text-xs text-gray-400 mt-1">{conv.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-50">
            {selectedConv ? (
              <>
                <div className="p-4 bg-white border-b">
                  <p className="font-semibold text-brand-purple">
                    {conversations.find(c => c.id === selectedConv)?.name}
                  </p>
                </div>

                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-2xl px-4 py-2 bg-white border">
                      <p className="text-sm">Bonjour, question sur les tarifs?</p>
                      <p className="text-xs text-gray-400 mt-1">10:15</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[70%] rounded-2xl px-4 py-2 bg-brand-turquoise text-white">
                      <p className="text-sm">Bien sûr! Je vous envoie ça.</p>
                      <p className="text-xs text-white/70 mt-1">10:20</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t">
                  <div className="flex items-end gap-2">
                    <Input
                      placeholder="Écrivez votre message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Sélectionnez une conversation
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
