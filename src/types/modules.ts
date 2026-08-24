import { Permission } from './auth';

export interface BusinessModule {
  id: string; // e.g. 'customers', 'finance'
  name: string;
  path: string;
  iconName: string; // references lucide icon string name
  requiredPermission: Permission;
  description: string;
  status: 'active' | 'beta' | 'disabled' | 'google-sync-required';
  category: 'command-center' | 'sales-customers' | 'supply-chain' | 'business-intel' | 'compliance-admin' | 'system';
}
