'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getClientFullData,
  ClientData,
  EventData,
} from '@/lib/client-helpers';

interface ClientDataContextType {
  client: ClientData | null;
  event: EventData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ClientDataContext = createContext<ClientDataContextType>({
  client: null,
  event: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) {
    throw new Error('useClientData must be used within ClientDataProvider');
  }
  return context;
}

interface ClientDataProviderProps {
  children: ReactNode;
}

export function ClientDataProvider({ children }: ClientDataProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    if (user.role !== 'client') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getClientFullData(user.uid);
      
      if (data) {
        setClient(data.client);
        setEvent(data.event);
      } else {
        setError('Aucune donnée client trouvée');
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return (
    <ClientDataContext.Provider
      value={{
        client,
        event,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </ClientDataContext.Provider>
  );
}
