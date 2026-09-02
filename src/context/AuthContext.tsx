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
import { UserProfile, UserRole, Permission, ROLE_PERMISSIONS } from '../types/auth';
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

      let role: UserRole = 'Guest';
      let permissions = ROLE_PERMISSIONS['Guest'];

      if (userSnap.exists()) {
        const data = userSnap.data();
        role = data.role || 'Guest';
        permissions = ROLE_PERMISSIONS[role] || [];
        
        // Update name or email in Firestore if changed
        if (data.displayName !== firebaseUser.displayName || data.email !== firebaseUser.email) {
          await updateDoc(userRef, {
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
          });
        }
      } else {
        // Determine role for brand-new users
        // Make admin@gudoria.com or first user the Owner.
        const isOwnerEmail = firebaseUser.email === 'admin@gudoria.com' || firebaseUser.email?.endsWith('@gudoria.com');
        role = explicitRole || (isOwnerEmail ? 'Owner' : 'Guest');
        permissions = ROLE_PERMISSIONS[role];

        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'GUD Member',
          role,
          createdAt: Date.now()
        });

        await auditLogService.logActivity(
          { uid: firebaseUser.uid, email: firebaseUser.email || '', displayName: firebaseUser.displayName || 'GUD Member' },
          'Onboarded new user profile in database',
          'users',
          `Created profile with role: ${role}`
        );
      }

      setProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'GUD Member',
        role,
        permissions,
        photoURL: firebaseUser.photoURL || undefined
      });
    } catch (error) {
      console.error('Error syncing user profile:', error);
      // Fallback local profile if Firestore fails
      setProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'GUD Member',
        role: 'Guest',
        permissions: ROLE_PERMISSIONS['Guest']
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncProfile(firebaseUser);
      } else {
        // Auto-provision demo owner profile so visitors immediately enter the platform on Netlify!
        setUser({
          uid: 'demo-owner-101',
          email: 'admin@goodoria.com',
          displayName: 'GUD Owner',
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
          providerId: 'demo'
        } as any);

        setProfile({
          uid: 'demo-owner-101',
          email: 'admin@goodoria.com',
          displayName: 'GUD Owner',
          role: 'Owner',
          permissions: ROLE_PERMISSIONS['Owner']
        });
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
    setLoading(true);
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
      setLoading(false);
      throw error;
    }
  };

  const APPROVED_USERS = [
    'mohith@gudoria.com',
    'boss@gudoria.com',
    'owner3@gudoria.com',
    'owner4@gudoria.com',
    'owner5@gudoria.com'
  ];

  const getExpectedPasswordForEmail = (email: string): string => {
    const e = email.toLowerCase().trim();
    if (e === 'mohith@gudoria.com') return 'GudoriaMohith2026!';
    if (e === 'boss@gudoria.com') return 'GudoriaBoss2026!';
    if (e === 'owner3@gudoria.com') return 'GudoriaOwner3!';
    if (e === 'owner4@gudoria.com') return 'GudoriaOwner4!';
    if (e === 'owner5@gudoria.com') return 'GudoriaOwner5!';
    return '';
  };

  const signInWithEmail = async (email: string, password: string) => {
    const lowerEmail = email.toLowerCase().trim();
    if (!APPROVED_USERS.includes(lowerEmail)) {
      throw new Error('Unauthorized domain or account email. Sign-in blocked.');
    }

    const expectedPassword = getExpectedPasswordForEmail(lowerEmail);
    if (password !== expectedPassword) {
      throw new Error('Incorrect password for this whitelisted account.');
    }

    setLoading(true);
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
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        try {
          console.log(`Auto-registering whitelisted user: ${lowerEmail}`);
          const regResult = await createUserWithEmailAndPassword(auth, lowerEmail, password);
          const defaultName = lowerEmail.split('@')[0].toUpperCase();
          await updateProfile(regResult.user, { displayName: defaultName });
          await syncProfile(regResult.user, 'Owner');
          
          await auditLogService.logActivity(
            { uid: regResult.user.uid, email: regResult.user.email || '', displayName: defaultName },
            'Auto-registered whitelisted user',
            'auth',
            'Created profile via login'
          );
        } catch (regErr) {
          console.error("Auto-registration failed:", regErr);
          throw error;
        }
      } else {
        setLoading(false);
        throw error;
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string, role: UserRole) => {
    const lowerEmail = email.toLowerCase().trim();
    if (!APPROVED_USERS.includes(lowerEmail)) {
      throw new Error('Unauthorized domain or account email. Registration blocked.');
    }

    const expectedPassword = getExpectedPasswordForEmail(lowerEmail);
    if (password !== expectedPassword) {
      throw new Error(`Registration password must match the whitelisted password: "${expectedPassword}"`);
    }

    setLoading(true);
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
      setLoading(false);
      throw error;
    }
  };

  const signInAnonymouslyUser = async (role: UserRole) => {
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      await syncProfile(result.user, role);

      await auditLogService.logActivity(
        { uid: result.user.uid, email: 'anonymous@goodoria.com', displayName: `Anonymous ${role}` },
        'User signed in anonymously',
        'auth',
        `Successful anonymous sign-in with role: ${role}`
      );
    } catch (error) {
      console.error('Anonymous Sign-In Error:', error);
      setLoading(false);
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
