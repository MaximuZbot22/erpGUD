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
  'Executive Assistant': [
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
    'settings:read',
    'users:read'
  ],
  'Operations': [
    'dashboard:read',
    'customers:read',
    'vendors:read', 'vendors:write',
    'products:read', 'products:write',
    'procurement:read', 'procurement:write',
    'production:read', 'production:write',
    'packaging:read', 'packaging:write',
    'assets:read',
    'documents:read', 'documents:write',
    'calendar:read', 'calendar:write',
    'tasks:read', 'tasks:write',
    'notifications:read'
  ],
  'Sales': [
    'dashboard:read',
    'customers:read', 'customers:write',
    'sales:read', 'sales:write',
    'products:read',
    'marketing:read',
    'documents:read',
    'calendar:read', 'calendar:write',
    'tasks:read', 'tasks:write',
    'notifications:read'
  ],
  'Marketing': [
    'dashboard:read',
    'customers:read',
    'marketing:read', 'marketing:write',
    'products:read',
    'assets:read', 'assets:write',
    'documents:read', 'documents:write',
    'calendar:read', 'calendar:write',
    'notifications:read'
  ],
  'Accounts': [
    'dashboard:read',
    'customers:read',
    'sales:read',
    'finance:read', 'finance:write',
    'vendors:read',
    'procurement:read',
    'documents:read',
    'notifications:read'
  ],
  'Production': [
    'dashboard:read',
    'products:read',
    'production:read', 'production:write',
    'procurement:read', 'procurement:write',
    'packaging:read', 'packaging:write',
    'tasks:read', 'tasks:write',
    'notifications:read'
  ],
  'Guest': [
    'dashboard:read',
    'customers:read',
    'vendors:read',
    'products:read',
    'marketing:read',
    'production:read',
    'documents:read',
    'calendar:read',
    'notifications:read'
  ]
};
