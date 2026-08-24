import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationPayload, NotificationChannel } from '../types/notification';
import { auditLogService } from './audit';

class NotificationService {
  private collectionName = 'notifications';

  /**
   * Dispatch a notification across selected channels
   */
  async send(payload: Omit<NotificationPayload, 'id' | 'timestamp' | 'read'>): Promise<string> {
    const timestamp = Date.now();
    
    // Create payload document
    const notificationDoc = {
      ...payload,
      timestamp,
      createdAt: serverTimestamp(),
      read: false,
    };

    console.log(`[Notification Engine] Dispatching: "${payload.title}" via: [${payload.channels.join(', ')}]`);

    let notificationId = '';

    // 1. Process IN-APP (Save to Firestore for UI notification drawer)
    if (payload.channels.includes('in-app')) {
      try {
        const docRef = await addDoc(collection(db, this.collectionName), notificationDoc);
        notificationId = docRef.id;
      } catch (error) {
        console.error('Failed to create in-app notification in Firestore:', error);
      }
    }

    // 2. Process other external channels (simulated integration layers)
    for (const channel of payload.channels) {
      if (channel === 'in-app') continue;
      await this.dispatchToChannel(channel, payload);
    }

    return notificationId;
  }

  /**
   * Specific channel dispatch handlers
   */
  private async dispatchToChannel(channel: NotificationChannel, payload: Omit<NotificationPayload, 'id' | 'timestamp' | 'read'>) {
    switch (channel) {
      case 'email':
        console.log(`[SMTP SERVICE] Sending email alert:
          To: ${payload.targetUserIds?.join(', ') || payload.targetRoles?.join(', ') || 'All Users'}
          Subject: [GUD ERP] - ${payload.title}
          Body: ${payload.message}
        `);
        break;

      case 'discord':
        console.log(`[DISCORD WEBHOOK] Posting alert:
          Payload: { content: "⚠️ **${payload.title}** (${payload.priority})\n${payload.message}" }
        `);
        break;

      case 'whatsapp':
        console.log(`[WHATSAPP BUSINESS API] Sending message:
          Recipient: ${payload.targetUserIds?.join(', ') || 'Group Broadcast'}
          Template: erp_standard_notification
          Parameters: { title: "${payload.title}", text: "${payload.message}" }
        `);
        break;

      case 'push':
        console.log(`[WEB PUSH SERVICE] Triggering push notifications:
          Title: ${payload.title}
          Body: ${payload.message}
        `);
        break;

      case 'calendar':
        console.log(`[GOOGLE CALENDAR SYNC] Adding notification reminder event to calendar...`);
        break;

      default:
        console.warn(`[Notification Engine] Unhandled notification channel: ${channel}`);
    }
  }

  /**
   * Fetch active notifications for a user by their UID or Role
   */
  async getUserNotifications(uid: string, role: string): Promise<NotificationPayload[]> {
    try {
      const q = query(
        collection(db, this.collectionName)
        // Note: Complex firestore queries need compound indexes, so we do client-side filtering 
        // to prevent index-creation errors during user onboarding.
      );
      
      const querySnapshot = await getDocs(q);
      const list: NotificationPayload[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter by user id or role
        const targetUsers = data.targetUserIds || [];
        const targetRoles = data.targetRoles || [];
        
        const matchesUser = targetUsers.length === 0 || targetUsers.includes(uid);
        const matchesRole = targetRoles.length === 0 || targetRoles.includes(role);
        
        if (matchesUser && matchesRole) {
          list.push({
            id: doc.id,
            title: data.title,
            message: data.message,
            timestamp: data.timestamp,
            read: data.read || false,
            priority: data.priority,
            channels: data.channels,
            targetRoles: data.targetRoles,
            targetUserIds: data.targetUserIds,
            link: data.link,
            metadata: data.metadata
          });
        }
      });

      // Sort descending by timestamp
      return list.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as read:`, error);
    }
  }
}

export const notificationService = new NotificationService();
