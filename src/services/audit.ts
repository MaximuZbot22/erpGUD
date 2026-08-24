import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLogEntry } from '../types/audit';

class AuditLogService {
  private collectionName = 'audit_logs';

  /**
   * Logs a user or system activity to Firestore and console
   */
  async logActivity(
    actor: { uid: string; email: string; displayName: string },
    action: string,
    category: AuditLogEntry['category'],
    details?: string,
    targetId?: string
  ): Promise<void> {
    const entry: any = {
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      actorId: actor.uid,
      actorEmail: actor.email,
      actorName: actor.displayName || 'Unnamed User',
      action,
      category,
    };

    if (details !== undefined) entry.details = details;
    if (targetId !== undefined) entry.targetId = targetId;

    // 1. Console Log for development tracing
    console.log(`[AUDIT LOG] [${category.toUpperCase()}] ${action} by ${entry.actorEmail} (ID: ${entry.actorId})`, { details, targetId });

    // 2. Write to Firestore
    try {
      await addDoc(collection(db, this.collectionName), entry);
    } catch (error) {
      console.warn('Failed to write audit log to Firestore:', error);
      // Fallback: local storage logger or silent fail in production
    }
  }

  /**
   * System level logger for background actions
   */
  async logSystemActivity(
    action: string,
    details?: string,
    targetId?: string
  ): Promise<void> {
    await this.logActivity(
      { uid: 'SYSTEM', email: 'system@goodoria.com', displayName: 'ERP System Engine' },
      action,
      'system',
      details,
      targetId
    );
  }
}

export const auditLogService = new AuditLogService();
