import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, UserRole, Permission, ROLE_PERMISSIONS, ALL_PERMISSIONS } from '../types/auth';
import { auditLogService } from '../services/audit';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  googleToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  signInAnonymouslyUser: (role: UserRole) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  signOutUser: () => Promise<void>;
  changeUserRole: (uid: string, newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(
    sessionStorage.getItem('gud_google_access_token')
  );
  const [loading, setLoading] = useState(true);

  // Sync user profile from Firestore or create default
  const syncProfile = async (firebaseUser: User, explicitRole?: UserRole) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      const resolvedName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'GUD Member';
      const role: UserRole = explicitRole || 'Owner';
      const permissions = ALL_PERMISSIONS;

      if (userSnap.exists()) {
        // Update name or email in Firestore if changed
        const data = userSnap.data();
        if (data.displayName !== resolvedName || data.email !== firebaseUser.email) {
          await updateDoc(userRef, {
            displayName: resolvedName,
            email: firebaseUser.email || '',
          });
        }
      } else {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: resolvedName,
          role,
          createdAt: Date.now()
        });

        await auditLogService.logActivity(
          { uid: firebaseUser.uid, email: firebaseUser.email || '', displayName: resolvedName },
          'Onboarded new user profile in database',
          'users',
          `Created profile with role: ${role}`
        );
      }

      setProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: resolvedName,
        role,
        permissions,
        photoURL: firebaseUser.photoURL || undefined
      });
    } catch (error) {
      console.error('Error syncing user profile:', error);
      const resolvedName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'GUD Member';
      // Fallback local profile if Firestore fails
      setProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: resolvedName,
        role: 'Owner',
        permissions: ALL_PERMISSIONS,
        photoURL: firebaseUser.photoURL || undefined
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncProfile(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
        setGoogleToken(null);
        sessionStorage.removeItem('gud_google_access_token');
      }
      setLoading(false);
    }, (err) => {
      console.warn('Auth listener error, unblocking UI:', err);
      setLoading(false);
    });

    // Safety timeout: If Firebase auth listener stalls or fails on Netlify, unblock UI in 3 seconds!
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Listen for shared Google OAuth token in Firestore if none is in session
  useEffect(() => {
    const tokenDocRef = doc(db, 'system', 'google_auth');
    const unsubscribe = onSnapshot(tokenDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.accessToken) {
          setGoogleToken(data.accessToken);
          sessionStorage.setItem('gud_google_access_token', data.accessToken);
        }
      }
    }, (error) => {
      console.warn('Silent Google token sync listener warning:', error);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (token) {
        setGoogleToken(token);
        sessionStorage.setItem('gud_google_access_token', token);
        
        // Save to Firestore for shared system access
        try {
          await setDoc(doc(db, 'system', 'google_auth'), {
            accessToken: token,
            updatedAt: Date.now(),
            updatedBy: result.user.email
          });
        } catch (dbErr) {
          console.warn('Failed to persist shared Google credentials in Firestore:', dbErr);
        }
      }

      await syncProfile(result.user);
      
      await auditLogService.logActivity(
        { uid: result.user.uid, email: result.user.email || '', displayName: result.user.displayName || '' },
        'User logged in via Google Workspace OAuth',
        'auth',
        'Successful OAuth sign-in'
      );
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const lowerEmail = email.toLowerCase().trim();
    if (!lowerEmail) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const result = await signInWithEmailAndPassword(auth, lowerEmail, password);
      await syncProfile(result.user);

      await auditLogService.logActivity(
        { uid: result.user.uid, email: result.user.email || '', displayName: result.user.displayName || '' },
        'User logged in via Email/Password',
        'auth',
        'Successful credentials sign-in'
      );
    } catch (error: any) {
      // Auto-register fallback if user account is not created yet
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          console.log(`Auto-creating new user account: ${lowerEmail}`);
          const regResult = await createUserWithEmailAndPassword(auth, lowerEmail, password);
          const defaultName = lowerEmail.split('@')[0].toUpperCase();
          await updateProfile(regResult.user, { displayName: defaultName });
          await syncProfile(regResult.user, 'Owner');
          
          await auditLogService.logActivity(
            { uid: regResult.user.uid, email: regResult.user.email || '', displayName: defaultName },
            'Auto-registered user account',
            'auth',
            'Created profile via login'
          );
          return;
        } catch (regErr: any) {
          console.warn("Auto-registration attempt error:", regErr);
          throw error;
        }
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string, role: UserRole) => {
    const lowerEmail = email.toLowerCase().trim();
    if (!lowerEmail) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, lowerEmail, password);
      await updateProfile(result.user, { displayName });
      
      // Force sync with specified role
      await syncProfile(result.user, role);

      await auditLogService.logActivity(
        { uid: result.user.uid, email: result.user.email || '', displayName },
        'User registered profile',
        'auth',
        `Successful registration with role: ${role}`
      );
    } catch (error) {
      console.error('Email Sign-Up Error:', error);
      throw error;
    }
  };

  const signInAnonymouslyUser = async (role: UserRole) => {
    try {
      try {
        const result = await signInAnonymously(auth);
        await syncProfile(result.user, role);

        await auditLogService.logActivity(
          { uid: result.user.uid, email: 'anonymous@goodoria.com', displayName: `Anonymous ${role}` },
          'User signed in anonymously',
          'auth',
          `Successful anonymous sign-in with role: ${role}`
        );
      } catch (fbErr: any) {
        console.warn('Firebase anonymous auth failed or disabled, activating instant local sandbox:', fbErr);
        // Fallback local sandbox user so users and presenters are never blocked
        const mockUser: any = {
          uid: `sandbox-${Date.now()}`,
          email: `${role.toLowerCase().replace(/\s+/g, '')}@goodoria.internal`,
          displayName: `Sandbox ${role}`,
          emailVerified: true,
          isAnonymous: true,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => '',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          photoURL: null,
          providerId: 'sandbox'
        };
        setUser(mockUser);
        setProfile({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          role,
          permissions: ALL_PERMISSIONS
        });
      }
    } catch (error) {
      console.error('Anonymous Sign-In Error:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      if (profile) {
        await auditLogService.logActivity(
          { uid: profile.uid, email: profile.email, displayName: profile.displayName },
          'User logged out',
          'auth'
        );
      }
      sessionStorage.removeItem('gud_google_access_token');
      localStorage.removeItem('gud_google_access_token');
      setGoogleToken(null);
      setUser(null);
      setProfile(null);
      await signOut(auth);
    } catch (error) {
      console.error('Sign-Out Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (uid: string, newRole: UserRole) => {
    if (!profile || !profile.permissions.includes('users:write')) {
      throw new Error('Unauthorized to modify user roles.');
    }

    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      
      // If current user is modifying their own role, trigger sync
      if (user && user.uid === uid) {
        await syncProfile(user);
      }

      await auditLogService.logActivity(
        { uid: profile.uid, email: profile.email, displayName: profile.displayName },
        `Changed user role`,
        'users',
        `Updated user UID: ${uid} to role: ${newRole}`
      );
    } catch (error) {
      console.error('Change role error:', error);
      throw error;
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!profile) return false;
    if (profile.role === 'Owner') return true;
    return profile.permissions ? profile.permissions.includes(permission) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        googleToken,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAnonymouslyUser,
        hasPermission,
        signOutUser,
        changeUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
