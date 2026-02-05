'use client';

import { useState } from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Pause, RotateCcw, Trash2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function TimerWidget() {
  const {
    isRunning,
    elapsedTime,
    currentTask,
    sessions,
    startTimer,
    stopTimer,
    resetTimer,
    deleteSession,
    setTaskName,
  } = useTimer();

  const [newTaskName, setNewTaskName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStart = () => {
    if (newTaskName.trim()) {
      startTimer(newTaskName);
      setNewTaskName('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-2 border-brand-turquoise text-brand-purple hover:bg-brand-turquoise hover:text-white gap-2"
        >
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">{formatTime(elapsedTime)}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-purple">
            Suivi du temps de travail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-brand-beige to-white border-0 shadow-lg">
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-brand-purple mb-2">
                {formatTime(elapsedTime)}
              </div>
              {isRunning && currentTask && (
                <p className="text-sm text-brand-gray">
                  En cours: {currentTask}
                </p>
              )}
            </div>

            {!isRunning ? (
              <div className="space-y-3">
                <Input
                  placeholder="Nom de la tâche..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStart()}
                  className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                />
                <Button
                  onClick={handleStart}
                  disabled={!newTaskName.trim()}
                  className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                >
                  <Play className="h-4 w-4" />
                  Démarrer
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={stopTimer}
                  className="flex-1 bg-red-500 hover:bg-red-600 gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Arrêter
                </Button>
                <Button
                  onClick={resetTimer}
                  variant="outline"
                  className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </Button>
              </div>
            )}
          </Card>

          {sessions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-brand-purple mb-3">
                Historique ({sessions.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="p-4 border-0 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-brand-purple">
                          {session.taskName}
                        </p>
                        <p className="text-sm text-brand-gray">
                          {formatDate(session.startTime)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-brand-turquoise">
                          {formatTime(session.duration)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSession(session.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-4 p-4 bg-brand-beige rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-purple">
                    Temps total:
                  </span>
                  <span className="text-xl font-bold text-brand-turquoise">
                    {formatTime(
                      sessions.reduce((acc, s) => acc + s.duration, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
