import { useEffect, useCallback, useRef } from 'react';
import { eventBus } from '@/lib/event-bus';

/**
 * 事件监听 Hook
 * 自动处理组件卸载时的清理工作
 */
export function useEventListener(event, handler, deps = []) {
  const handlerRef = useRef(handler);

  // 更新处理器引用
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (data) => handlerRef.current(data);
    const unsubscribe = eventBus.on(event, listener);

    return unsubscribe;
  }, [event, ...deps]);
}

/**
 * 事件发射器 Hook
 * 返回一个稳定的事件发射函数
 */
export function useEventEmitter() {
  return useCallback((event, data) => {
    eventBus.emit(event, data);
  }, []);
}

/**
 * 通知系统 Hook
 */
export function useNotification() {
  const emit = useEventEmitter();

  return {
    success: useCallback((message, duration) => {
      emit('notification', { type: 'success', message, duration });
    }, [emit]),

    error: useCallback((message, duration) => {
      emit('notification', { type: 'error', message, duration });
    }, [emit]),

    warning: useCallback((message, duration) => {
      emit('notification', { type: 'warning', message, duration });
    }, [emit]),

    info: useCallback((message, duration) => {
      emit('notification', { type: 'info', message, duration });
    }, [emit]),
  };
}

/**
 * 文档操作 Hook
 */
export function useDocument() {
  const emit = useEventEmitter();

  return {
    save: useCallback((id, content) => {
      emit('document:save', { id, content });
    }, [emit]),

    update: useCallback((id, title, content) => {
      emit('document:update', { id, title, content });
    }, [emit]),

    create: useCallback((title, content) => {
      emit('document:create', { title, content });
    }, [emit]),

    delete: useCallback((id) => {
      emit('document:delete', { id });
    }, [emit]),
  };
}

/**
 * AI助手 Hook
 */
export function useAI() {
  const emit = useEventEmitter();

  return {
    send: useCallback((message, context) => {
      emit('ai:message', { message, context });
    }, [emit]),

    response: useCallback((response, messageId) => {
      emit('ai:response', { response, messageId, timestamp: Date.now() });
    }, [emit]),

    error: useCallback((error, code) => {
      emit('ai:error', { error, code, timestamp: Date.now() });
    }, [emit]),

    thinking: useCallback((isThinking) => {
      emit('ai:thinking', { isThinking });
    }, [emit]),
  };
}

/**
 * 协作功能 Hook
 */
export function useCollaboration() {
  const emit = useEventEmitter();

  return {
    userJoined: useCallback((user) => {
      emit('collaboration:user-joined', user);
    }, [emit]),

    userLeft: useCallback((userId) => {
      emit('collaboration:user-left', { userId });
    }, [emit]),

    cursorMove: useCallback((position) => {
      emit('collaboration:cursor-move', position);
    }, [emit]),

    selectionChange: useCallback((selection) => {
      emit('collaboration:selection-change', selection);
    }, [emit]),
  };
}

/**
 * 聊天功能 Hook
 */
export function useChat() {
  const emit = useEventEmitter();

  return {
    sendMessage: useCallback((content, roomId, user) => {
      emit('chat:message-send', { 
        content, 
        roomId, 
        user,
        timestamp: Date.now() 
      });
    }, [emit]),

    receiveMessage: useCallback((message) => {
      emit('chat:message-receive', message);
    }, [emit]),

    typing: useCallback((isTyping, roomId, userId) => {
      emit('chat:typing', { isTyping, roomId, userId });
    }, [emit]),
  };
} 