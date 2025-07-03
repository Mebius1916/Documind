import { create } from 'zustand';

// 创建事件总线 Store
export const useEventBus = create(() => ({
  listeners: new Map(),

  // 发布事件
  emit: (event, data) => {
    const state = useEventBus.getState();
    const eventListeners = state.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Event listener error for "${event}":`, error);
        }
      });
    }
  },

  // 订阅事件
  on: (event, listener) => {
    const state = useEventBus.getState();
    const newListeners = new Map(state.listeners);
    if (!newListeners.has(event)) {
      newListeners.set(event, new Set());
    }
    newListeners.get(event).add(listener);
    useEventBus.setState({ listeners: newListeners });

    // 返回取消订阅函数
    return () => useEventBus.getState().off(event, listener);
  },

  // 取消订阅
  off: (event, listener) => {
    const state = useEventBus.getState();
    const newListeners = new Map(state.listeners);
    const eventListeners = newListeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        newListeners.delete(event);
      }
    }
    useEventBus.setState({ listeners: newListeners });
  },

  // 清除监听器
  clear: (event) => {
    const state = useEventBus.getState();
    const newListeners = new Map(state.listeners);
    if (event) {
      newListeners.delete(event);
    } else {
      newListeners.clear();
    }
    useEventBus.setState({ listeners: newListeners });
  },
}));

// 导出便捷方法
export const eventBus = {
  emit: (event, data) => useEventBus.getState().emit(event, data),
  on: (event, listener) => useEventBus.getState().on(event, listener),
  off: (event, listener) => useEventBus.getState().off(event, listener),
  clear: (event) => useEventBus.getState().clear(event),
}; 