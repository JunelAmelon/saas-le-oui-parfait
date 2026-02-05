'use client';

import { Card } from '@/components/ui/card';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function TimeTracker() {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 shadow-xl border-0">
      <h3 className="text-lg font-bold text-brand-gray-dark mb-4">
        Temps de travail
      </h3>

      <div className="text-center">
        <div className="mb-4 rounded-lg bg-brand-beige p-6">
          <p className="text-4xl font-bold text-brand-purple font-mono">
            {formatTime(time)}
          </p>
        </div>

        <Button
          onClick={() => setIsRunning(!isRunning)}
          className={`w-full gap-2 ${
            isRunning
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-brand-turquoise hover:bg-brand-turquoise-hover'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Démarrer
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
