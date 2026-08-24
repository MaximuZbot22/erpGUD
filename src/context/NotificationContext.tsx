import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { NotificationPayload } from '../types/notification';
import { notificationService } from '../services/notifications';

interface NotificationContextType {
  notifications: NotificationPayload[];
  unreadCount: number;
  loading: boolean;
  sendNotification: (payload: Omit<NotificationPayload, 'id' | 'timestamp' | 'read'>) => Promise<string>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listen to ALL notifications and filter client-side to prevent missing index errors
    const q = query(collection(db, 'notifications'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: NotificationPayload[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const targetUsers = data.targetUserIds || [];
          const targetRoles = data.targetRoles || [];

          const matchesUser = targetUsers.length === 0 || targetUsers.includes(profile.uid);
          const matchesRole = targetRoles.length === 0 || targetRoles.includes(profile.role);

          if (matchesUser && matchesRole) {
            list.push({
              id: docSnap.id,
              title: data.title,
              message: data.message,
              timestamp: data.timestamp,
              read: data.read || false,
              priority: data.priority,
              channels: data.channels,
              targetRoles: data.targetRoles,
              targetUserIds: data.targetUserIds,
              link: data.link,
              metadata: data.metadata,
            });
          }
        });

        // Sort descending by timestamp
        const sorted = list.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(sorted);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time notifications sync error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  const sendNotification = async (payload: Omit<NotificationPayload, 'id' | 'timestamp' | 'read'>) => {
    return notificationService.send(payload);
  };

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!profile || notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;
      
      notifications.forEach((n) => {
        if (!n.read) {
          const docRef = doc(db, 'notifications', n.id);
          batch.update(docRef, { read: true });
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        sendNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
