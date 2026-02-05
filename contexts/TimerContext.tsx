'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface TimerSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  taskName: string;
}

interface TimerContextType {
  isRunning: boolean;
  elapsedTime: number;
  currentTask: string;
  sessions: TimerSession[];
  startTimer: (taskName: string) => void;
  stopTimer: () => void;
  resetTimer: () => void;
  deleteSession: (id: string) => void;
  setTaskName: (name: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    const savedState = localStorage.getItem('timerState');
    if (savedState) {
      const state = JSON.parse(savedState);
      setIsRunning(state.isRunning);
      setCurrentTask(state.currentTask || '');
      setStartTime(state.startTime);

      if (state.isRunning && state.startTime) {
        setElapsedTime(Math.floor((Date.now() - state.startTime) / 1000));
      } else {
        setElapsedTime(state.elapsedTime || 0);
      }
    }

    const savedSessions = localStorage.getItem('timerSessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  useEffect(() => {
    const state = {
      isRunning,
      elapsedTime,
      currentTask,
      startTime,
    };
    localStorage.setItem('timerState', JSON.stringify(state));
  }, [isRunning, elapsedTime, currentTask, startTime]);

  useEffect(() => {
    localStorage.setItem('timerSessions', JSON.stringify(sessions));
  }, [sessions]);

  const startTimer = (taskName: string) => {
    const now = Date.now();
    setIsRunning(true);
    setStartTime(now);
    setCurrentTask(taskName);
    setElapsedTime(0);
  };

  const stopTimer = () => {
    if (isRunning && startTime) {
      const session: TimerSession = {
        id: Date.now().toString(),
        startTime,
        endTime: Date.now(),
        duration: elapsedTime,
        taskName: currentTask || 'Tâche sans nom',
      };
      setSessions([session, ...sessions]);
    }
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setCurrentTask('');
  };

  const resetTimer = () => {
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setCurrentTask('');
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const setTaskName = (name: string) => {
    setCurrentTask(name);
  };

  return (
    <TimerContext.Provider
      value={{
        isRunning,
        elapsedTime,
        currentTask,
        sessions,
        startTimer,
        stopTimer,
        resetTimer,
        deleteSession,
        setTaskName,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
