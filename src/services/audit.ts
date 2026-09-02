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

    // Save copy to localStorage audit log cache for offline/fast UI retrieval
    try {
      const existingLogs = JSON.parse(localStorage.getItem('gud_audit_logs_cache') || '[]');
      existingLogs.unshift({ ...entry, id: `LOG-LOCAL-${Date.now()}` });
      localStorage.setItem('gud_audit_logs_cache', JSON.stringify(existingLogs.slice(0, 100)));
    } catch {
      // Ignore local storage error
    }

    // 1. Console Log for development tracing
    console.log(`[AUDIT LOG] [${category.toUpperCase()}] ${action} by ${entry.actorEmail} (ID: ${entry.actorId})`, { details, targetId });

    // 2. Write to Firestore
    try {
      await addDoc(collection(db, this.collectionName), entry);
    } catch (error) {
      console.warn('Failed to write audit log to Firestore:', error);
    }
  }

  /**
   * Enhanced logger accepting before and after data snapshots for financial/stock edits
   */
  async logDataMutation(
    actor: { uid: string; email: string; displayName: string },
    action: string,
    category: AuditLogEntry['category'],
    targetId: string,
    beforeState?: any,
    afterState?: any,
    notes?: string
  ): Promise<void> {
    const details = JSON.stringify({
      notes: notes || action,
      before: beforeState || null,
      after: afterState || null
    });
    await this.logActivity(actor, action, category, details, targetId);
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
