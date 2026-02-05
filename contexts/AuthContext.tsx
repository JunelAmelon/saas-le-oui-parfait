'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SimpleUser {
  email: string;
  role: 'planner' | 'client';
}

interface AuthContextType {
  user: SimpleUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('simpleUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const emailLower = email.toLowerCase().trim();

    let role: 'planner' | 'client' = 'planner';

    if (emailLower.includes('client')) {
      role = 'client';
    }

    const userData: SimpleUser = {
      email: emailLower,
      role,
    };

    localStorage.setItem('simpleUser', JSON.stringify(userData));
    setUser(userData);

    if (role === 'client') {
      router.push('/espace-client');
    } else {
      router.push('/');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('simpleUser');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
