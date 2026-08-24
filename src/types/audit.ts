export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: string;
  category: 'auth' | 'finance' | 'production' | 'procurement' | 'sales' | 'customers' | 'vendors' | 'products' | 'documents' | 'settings' | 'users' | 'system' | 'legal' | 'tasks';
  details?: string;
  ipAddress?: string;
  targetId?: string; // e.g. DOC0001, CUST0002
}
