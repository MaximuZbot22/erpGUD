export type UserRole =
  | 'Owner'
  | 'Executive Assistant'
  | 'Operations'
  | 'Sales'
  | 'Marketing'
  | 'Accounts'
  | 'Production'
  | 'Guest';

export type Permission =
  // Dashboard
  | 'dashboard:read'
  // Business Modules
  | 'customers:read' | 'customers:write'
  | 'vendors:read' | 'vendors:write'
  | 'products:read' | 'products:write'
  | 'procurement:read' | 'procurement:write'
  | 'sales:read' | 'sales:write'
  | 'marketing:read' | 'marketing:write'
  | 'legal:read' | 'legal:write'
  | 'finance:read' | 'finance:write'
  | 'production:read' | 'production:write'
  | 'packaging:read' | 'packaging:write'
  | 'whatsapp:read' | 'whatsapp:write'
  | 'meetings:read' | 'meetings:write'
  | 'research:read' | 'research:write'
  | 'assets:read' | 'assets:write'
  | 'documents:read' | 'documents:write'
  | 'calendar:read' | 'calendar:write'
  | 'tasks:read' | 'tasks:write'
  | 'notifications:read' | 'notifications:write'
  | 'settings:read' | 'settings:write'
  | 'users:read' | 'users:write';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  permissions: Permission[];
}

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:read',
  'customers:read', 'customers:write',
  'vendors:read', 'vendors:write',
  'products:read', 'products:write',
  'procurement:read', 'procurement:write',
  'sales:read', 'sales:write',
  'marketing:read', 'marketing:write',
  'legal:read', 'legal:write',
  'finance:read', 'finance:write',
  'production:read', 'production:write',
  'packaging:read', 'packaging:write',
  'whatsapp:read', 'whatsapp:write',
  'meetings:read', 'meetings:write',
  'research:read', 'research:write',
  'assets:read', 'assets:write',
  'documents:read', 'documents:write',
  'calendar:read', 'calendar:write',
  'tasks:read', 'tasks:write',
  'notifications:read', 'notifications:write',
  'settings:read', 'settings:write',
  'users:read', 'users:write'
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'Owner': ALL_PERMISSIONS,
  'Executive Assistant': ALL_PERMISSIONS,
  'Operations': ALL_PERMISSIONS,
  'Sales': ALL_PERMISSIONS,
  'Marketing': ALL_PERMISSIONS,
  'Accounts': ALL_PERMISSIONS,
  'Production': ALL_PERMISSIONS,
  'Guest': ALL_PERMISSIONS
};
