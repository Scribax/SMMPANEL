import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '../lib/api';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Check support and active subscription
  const checkSubscription = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      setLoading(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!isSupported) return null;
    setLoading(true);

    try {
      // 1. Get VAPID public key from backend
      const res = await pushApi.getVapidKey();
      const vapidPublicKey = res.data.publicKey;

      // 2. Request permission if default
      if (Notification.permission === 'default') {
        const status = await Notification.requestPermission();
        setPermission(status);
        if (status !== 'granted') {
          setLoading(false);
          return null;
        }
      } else if (Notification.permission === 'denied') {
        alert('Las notificaciones están bloqueadas en tu navegador. Por favor actívalas en la configuración del sitio.');
        setLoading(false);
        return null;
      }

      // 3. Register push subscription
      const registration = await navigator.serviceWorker.ready;
      
      // Convert VAPID key to Uint8Array
      const padding = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
      const base64 = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });

      // 4. Send subscription to backend
      await pushApi.subscribe(sub);
      
      setSubscription(sub);
      setPermission('granted');
      return sub;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    setLoading(true);

    try {
      // 1. Call backend to remove
      await pushApi.unsubscribe(subscription.endpoint);

      // 2. Unsubscribe locally
      await subscription.unsubscribe();
      
      setSubscription(null);
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    isSubscribed: !!subscription,
    loading,
    subscribe,
    unsubscribe,
  };
}
