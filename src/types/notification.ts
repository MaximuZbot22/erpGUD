export type NotificationChannel = 'in-app' | 'email' | 'discord' | 'whatsapp' | 'push' | 'calendar';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  targetRoles?: string[];
  targetUserIds?: string[];
  link?: string;
  metadata?: Record<string, any>;
}
