"use client";

import { toast } from 'sonner';
import { useEventListener } from '@/hooks/use-event-bus';

/**
 * 通知监听器组件
 * 监听通知事件并显示Toast
 */
export function NotificationListener() {
  useEventListener('notification', (data) => {
    const { type, message, duration = 4000 } = data;
    
    switch (type) {
      case 'success':
        toast.success(message, { duration });
        break;
      case 'error':
        toast.error(message, { duration });
        break;
      case 'warning':
        toast.warning(message, { duration });
        break;
      case 'info':
        toast.info(message, { duration });
        break;
      default:
        toast(message, { duration });
    }
  });

  return null;
} 