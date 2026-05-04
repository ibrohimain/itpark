import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userProfile = await firestoreService.getDocument<UserProfile>('users', user.uid);
        if (userProfile) {
          setProfile(userProfile);
        } else if (user.email === 'direktor@gmail.com') {
          // Auto-create director profile if it doesn't exist
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            fullName: 'Platform Director',
            role: 'director',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await firestoreService.setDocument('users', user.uid, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
