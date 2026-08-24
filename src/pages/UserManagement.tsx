import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ShieldCheck, ShieldAlert, RefreshCcw, Shield } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../types/auth';

interface DatabaseUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: number;
}

export const UserManagement: React.FC = () => {
  const { profile, changeUserRole } = useAuth();
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Real-time listener for users in Firestore
  useEffect(() => {
    if (!profile || !profile.permissions.includes('users:read')) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: DatabaseUser[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as DatabaseUser);
        });
        setUsers(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users collection:', error);
        setErrorMessage('Failed to fetch user profiles. Check security rules.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  if (!profile || !profile.permissions.includes('users:read')) {
    return (
      <div className="p-8 text-center bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-900/50 rounded-xl max-w-xl mx-auto space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto stroke-[1.5]" />
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Security Violation - Access Denied</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your current profile role (<strong>{profile?.role || 'Guest'}</strong>) is not authorized to read user management files. Contact Owner.
        </p>
      </div>
    );
  }

  const handleRoleChange = async (uid: string, nextRole: UserRole) => {
    setErrorMessage(null);
    setRoleUpdatingId(uid);
    try {
      await changeUserRole(uid, nextRole);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update user role.');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const rolesList: UserRole[] = [
    'Owner',
    'Executive Assistant',
    'Operations',
    'Sales',
    'Marketing',
    'Accounts',
    'Production',
    'Guest',
  ];

  const columns = [
    { 
      key: 'displayName', 
      header: 'Member Name', 
      className: 'font-semibold text-slate-800 dark:text-slate-200' 
    },
    { key: 'email', header: 'Email Address' },
    { 
      key: 'uid', 
      header: 'UID String', 
      render: (row: DatabaseUser) => <span className="font-mono text-slate-400 font-bold select-all">{row.uid}</span> 
    },
    {
      key: 'role',
      header: 'Active Role',
      render: (row: DatabaseUser) => (
        <span className="flex items-center gap-1.5">
          {roleUpdatingId === row.uid ? (
            <RefreshCcw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
          )}
          <StatusBadge status={row.role} />
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Onboarded Date',
      render: (row: DatabaseUser) => 
        row.createdAt 
          ? new Date(row.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
          : 'Legacy'
    }
  ];

  const rowActions = (row: DatabaseUser) => {
    // Cannot modify own role to prevent lockout self-denials
    if (row.uid === profile.uid) return [];

    return rolesList
      .filter((role) => role !== row.role)
      .map((role) => ({
        label: `Make ${role}`,
        onClick: () => handleRoleChange(row.uid, role),
      }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Role-Based Access Control</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage corporate team roles and permissions across system database collections.</p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4.5 h-4.5" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span>Corporate User Roster</span>
          </CardTitle>
          {loading && <RefreshCcw className="w-4 h-4 animate-spin text-slate-400" />}
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={users}
            rowIdKey="uid"
            loading={loading}
            rowActions={rowActions}
          />
        </CardContent>
      </Card>
    </div>
  );
};
export default UserManagement;
