import { useEventBus, EventPayload } from "@/store/use-event-bus";

/**
 * 发送导航事件
 * @param path 导航路径
 * @param options 导航选项
 */
export function navigate(path: string, options?: { replace?: boolean; newTab?: boolean }) {
  const payload: EventPayload = { 
    path,
    ...options
  };
  
  useEventBus.getState().emit("NAVIGATE", payload);
}

/**
 * 发送错误事件
 * @param message 错误消息
 * @param error 错误对象
 */
export function reportError(message: string, error?: Error) {
  const payload: EventPayload = { 
    message,
    error,
    timestamp: Date.now()
  };
  
  useEventBus.getState().emit("ERROR", payload);
}

/**
 * 发送通知事件
 * @param message 通知消息
 * @param type 通知类型 
 */
export function sendNotification(
  message: string, 
  type: "info" | "success" | "warning" | "error" = "info",
  duration?: number
) {
  const payload: EventPayload = {
    message,
    type,
    duration,
    timestamp: Date.now()
  };
  
  useEventBus.getState().emit("NOTIFICATION", payload);
}

/**
 * 发送文档变更事件
 * @param documentId 文档ID
 * @param action 操作类型
 */
export function documentChanged(documentId: string, action: "created" | "updated" | "deleted") {
  const payload: EventPayload = {
    documentId,
    action,
    timestamp: Date.now() 
  };
  
  useEventBus.getState().emit("DOCUMENT_CHANGE", payload);
} 