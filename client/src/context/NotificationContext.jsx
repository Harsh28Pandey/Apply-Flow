import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAccessToken, API_BASE_URL } from '../api/client';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let eventSource;
    try {
      // Connect to SSE tracking stream
      eventSource = new EventSource(`${API_BASE_URL}/api/v1/tracking/stream?token=${encodeURIComponent(getAccessToken() || '')}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'open') {
            toast.success(
              data.isBot
                ? `🤖 Automated prefetch detected (${data.botReason || 'Mail Proxy'})`
                : `📬 Email was just opened!`,
              { id: `open-${data.emailId}-${Date.now()}` }
            );
          } else if (data.type === 'click') {
            toast.success(`🔗 Recipient clicked link: ${data.destinationUrl || ''}`, {
              id: `click-${data.emailId}-${Date.now()}`,
            });
          }

          // Invalidate relevant queries so tables & KPI cards update live!
          queryClient.invalidateQueries({ queryKey: ['emails'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-timeseries'] });
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        } catch (err) {
          // Non-JSON or heartbeat
        }
      };

      eventSource.onerror = () => {
        // EventSource handles reconnection automatically
      };
    } catch (err) {
      // Ignore
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user, queryClient]);

  return <NotificationContext.Provider value={{}}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
