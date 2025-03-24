//事件总线
import { create } from "zustand";

// 定义事件类型
export type EventType = 
  | "NAVIGATE"       // 路由导航
  | "ERROR"          // 错误处理
  | "NOTIFICATION"   // 通知消息
  | "DOCUMENT_CHANGE"; // 文档变更

// 事件载荷类型
export interface EventPayload {
  [key: string]: any;
}

// 事件监听器类型
export type EventListener = (payload: EventPayload) => void;

// 事件总线状态接口
interface EventBusState {
  listeners: Map<EventType, Set<EventListener>>; // 改用Map和Set提升性能
  on: (eventType: EventType, listener: EventListener) => () => void;
  emit: (eventType: EventType, payload: EventPayload) => void;
}

// 创建事件总线 store
export const useEventBus = create<EventBusState>((set, get) => ({
  listeners: new Map(),
  
  on: (eventType, listener) => {
    const { listeners } = get();
    // 使用深比较检查现有监听器
    if (listeners.get(eventType)?.has(listener)) {
      return () => {}; // 已存在相同监听器直接返回空函数
    }

    const newMap = new Map(listeners);
    newMap.set(eventType, new Set([...(newMap.get(eventType) || []), listener]));
    set({ listeners: newMap });

    return () => {
      const { listeners } = get();
      const current = listeners.get(eventType);
      if (current?.has(listener)) {
        const newSet = new Set(current);
        newSet.delete(listener);
        // 仅在实际变化时更新状态
        if (newSet.size !== current.size) {
          set({ listeners: new Map(listeners).set(eventType, newSet) });
        }
      }
    };
  },

  emit: (eventType, payload) => {
    const { listeners } = get();
    listeners.get(eventType)?.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`事件监听器错误: ${eventType}`, error);
      }
    });
  }
})); 