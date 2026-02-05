'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
}

export function EventDetailModal({ open, onOpenChange, event }: EventDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{event.couple}</DialogTitle>
        </DialogHeader>
        <div className="p-4">Event details for {event.couple}</div>
      </DialogContent>
    </Dialog>
  );
}
