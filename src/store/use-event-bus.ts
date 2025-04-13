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
  off: (eventType: EventType, listener: EventListener) => void;
  emit: (eventType: EventType, payload: EventPayload) => void;
  once: (eventType: EventType, listener: EventListener) => void;
  clear: (eventType?: EventType) => void;
}

// 创建事件总线 store
export const useEventBus = create<EventBusState>((set, get) => ({
  listeners: new Map(),
  
  on: (eventType, listener) => {
    const { listeners } = get();
    
    // 检查现有监听器
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    
    if (listeners.get(eventType)?.has(listener)) {
      return () => {}; // 已存在相同监听器直接返回空函数
    }

    const newListeners = new Map(listeners);
    const currentListeners = listeners.get(eventType) || new Set();
    const newSet = new Set(currentListeners);
    newSet.add(listener);
    newListeners.set(eventType, newSet);
    
    set({ listeners: newListeners });

    // 返回解绑函数
    return () => {
      get().off(eventType, listener);
    };
  },
  
  off: (eventType, listener) => {
    const { listeners } = get();
    const currentListeners = listeners.get(eventType);
    
    if (currentListeners?.has(listener)) {
      const newListeners = new Map(listeners);
      const newSet = new Set(currentListeners);
      newSet.delete(listener);
      
      if (newSet.size === 0) {
        newListeners.delete(eventType);
      } else {
        newListeners.set(eventType, newSet);
      }
      
      set({ listeners: newListeners });
    }
  },

  emit: (eventType, payload) => {
    const { listeners } = get();
    const currentListeners = listeners.get(eventType);
    
    if (currentListeners) {
      // 转换为数组后再遍历，防止回调中修改监听器集合导致的问题
      Array.from(currentListeners).forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`事件监听器错误: ${eventType}`, error);
        }
      });
    }
  },
  
  once: (eventType, listener) => {
    // 创建一次性监听器
    const onceListener = (payload: EventPayload) => {
      get().off(eventType, onceListener); // 先移除自身
      listener(payload); // 再执行原始监听器
    };
    
    get().on(eventType, onceListener);
  },
  
  clear: (eventType) => {
    const { listeners } = get();
    const newListeners = new Map(listeners);
    
    if (eventType) {
      // 清除特定事件类型的所有监听器
      newListeners.delete(eventType);
    } else {
      // 清除所有监听器
      newListeners.clear();
    }
    
    set({ listeners: newListeners });
  }
})); 