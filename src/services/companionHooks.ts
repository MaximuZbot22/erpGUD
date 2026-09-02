/**
 * Companion App API & Event Hook Emitter
 * Exposes clean structured events for eventual consumption by the external reminder engine.
 */

export type ERPEventType = 
  | 'invoice_created'
  | 'invoice_sent'
  | 'payment_pending'
  | 'payment_received'
  | 'po_issued'
  | 'stock_received'
  | 'delivery_completed'
  | 'customer_return_approved';

export interface ERPEventPayload {
  eventType: ERPEventType;
  timestamp: number;
  entityId: string;
  customerId?: string;
  supplierId?: string;
  amount?: number;
  details?: Record<string, any>;
}

type EventListener = (payload: ERPEventPayload) => void;

class CompanionHookEmitter {
  private listeners: EventListener[] = [];

  /**
   * Register listener for ERP events
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit structured event to external memory / companion hooks
   */
  emit(eventType: ERPEventType, entityId: string, extra?: { customerId?: string; supplierId?: string; amount?: number; details?: Record<string, any> }): void {
    const payload: ERPEventPayload = {
      eventType,
      timestamp: Date.now(),
      entityId,
      ...extra
    };

    console.log(`[COMPANION HOOK EMITTED] ${eventType.toUpperCase()} for ID: ${entityId}`, payload);

    // Notify in-process listeners
    this.listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (e) {
        console.warn('Companion hook listener error:', e);
      }
    });

    // Save event history cache for Companion API polling
    try {
      const history = JSON.parse(localStorage.getItem('gud_companion_events_history') || '[]');
      history.unshift(payload);
      localStorage.setItem('gud_companion_events_history', JSON.stringify(history.slice(0, 200)));
    } catch {
      // Ignore local storage error
    }
  }
}

export const companionHooks = new CompanionHookEmitter();
