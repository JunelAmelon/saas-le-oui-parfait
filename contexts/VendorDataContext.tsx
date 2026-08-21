'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getVendorByAuthId, VendorProfile } from '@/lib/vendor-helpers';

interface VendorDataContextType {
  vendor: VendorProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const VendorDataContext = createContext<VendorDataContextType>({
  vendor: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useVendorData() {
  const context = useContext(VendorDataContext);
  return context;
}

interface VendorDataProviderProps {
  children: ReactNode;
}

export function VendorDataProvider({ children }: VendorDataProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    if (user.role && user.role !== 'vendor') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Try via vendor_id on profile
      let vendorProfile: VendorProfile | null = null;
      if (user.vendor_id) {
        const { getVendorById } = await import('@/lib/vendor-helpers');
        vendorProfile = await getVendorById(user.vendor_id);
      }

      // 2. Fallback: lookup by pro_account_uid
      if (!vendorProfile && user.uid) {
        vendorProfile = await getVendorByAuthId(user.uid);
      }

      setVendor(vendorProfile);
    } catch (e: any) {
      console.error('Error fetching vendor data:', e);
      setError(e?.message || 'Erreur lors du chargement');
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <VendorDataContext.Provider
      value={{ vendor, loading, error, refresh: fetchData }}
    >
      {children}
    </VendorDataContext.Provider>
  );
}
