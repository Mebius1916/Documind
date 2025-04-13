import { useEffect, useRef, useMemo } from "react";
import { EventType, EventPayload, useEventBus } from "@/store/use-event-bus";

/**
 * 在组件中订阅事件的Hook
 * @param eventType 事件类型
 * @param handler 事件处理函数
 * @param deps 依赖数组，用于控制事件监听器的重新订阅
 */
export function useEvent(
  eventType: EventType,
  handler: (payload: EventPayload) => void,
  deps: React.DependencyList = []
) {
  const { on } = useEventBus();
  const handlerRef = useRef(handler);
  
  // 更新引用，确保始终使用最新的处理函数
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  // 使用useMemo包装依赖数组，确保具有相同内容的数组引用相等
  const memoizedDeps = useMemo(() => deps, deps);
  
  useEffect(() => {
    // 使用稳定的引用创建监听器
    const listener = (payload: EventPayload) => {
      handlerRef.current(payload);
    };
    
    // 订阅事件
    const unsubscribe = on(eventType, listener);
    
    // 组件卸载时取消订阅
    return unsubscribe;
  }, [eventType, on, memoizedDeps]);
}

/**
 * 简便的事件发射器Hook
 * @returns 发射事件的函数
 */
export function useEmitEvent() {
  const { emit } = useEventBus();
  return emit;
}

/**
 * 简便的一次性事件监听Hook
 * @param eventType 事件类型
 * @param handler 事件处理函数
 */
export function useEventOnce(
  eventType: EventType,
  handler: (payload: EventPayload) => void
) {
  const { once } = useEventBus();
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const listener = (payload: EventPayload) => {
      handlerRef.current(payload);
    };
    
    once(eventType, listener);
  }, [eventType, once]);
} 