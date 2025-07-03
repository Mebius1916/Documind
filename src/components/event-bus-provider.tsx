"use client";

import { useEffect, useState } from 'react';
import { eventBus, useEventBus } from '@/lib/event-bus';

/**
 * 事件总线提供者组件
 * 用于全局初始化事件总线和开发工具
 */
export function EventBusProvider({ 
  children, 
  enableDevLogs = false 
}) {
  useEffect(() => {
    // 开发模式下的事件日志
    if (enableDevLogs && process.env.NODE_ENV === 'development') {
      const originalEmit = eventBus.emit;
      
      // 重写emit方法添加日志
      eventBus.emit = function<T>(event: string, data: T) {
        console.group(`🚀 Event: ${event}`);
        console.log('Data:', data);
        console.log('Timestamp:', new Date().toISOString());
        console.groupEnd();
        
        return originalEmit.call(this, event, data);
      };

      console.log('🎯 Event Bus initialized with dev logs');
    }

    // 组件卸载时清理所有监听器
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Event Bus cleanup');
      }
      eventBus.clear();
    };
  }, [enableDevLogs]);

  return <>{children}</>;
}

/**
 * Hook 用于检查事件总线状态
 */
export function useEventBusStatus() {
  const [listenerCount, setListenerCount] = useState(0);
  
  useEffect(() => {
    const updateCount = () => {
      const state = useEventBus.getState();
      let count = 0;
      state.listeners.forEach(listeners => {
        count += listeners.size;
      });
      setListenerCount(count);
    };
    
    // 初始更新
    updateCount();
    
    // 监听状态变化
    const unsubscribe = useEventBus.subscribe(updateCount);
    
    return unsubscribe;
  }, []);
  
  return { listenerCount };
} 