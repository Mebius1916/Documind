//订阅者
import { useEventBus, EventPayload } from "@/store/use-event-bus";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";

// 导航事件处理
export function useNavigationEvents() {
  const router = useRouter();
  const eventBus = useEventBus();
  
  useEffect(() => {
    const handler = (payload: EventPayload) => {
      const { path, options } = payload;
      
      if (options?.newTab) {
        window.open(path, "_blank");
      } else if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    };
    const unsubscribe = eventBus.on("NAVIGATE", handler);
    return () => unsubscribe();
  }, [router, eventBus]);
}

// 错误事件处理
export function useErrorEvents() {
  const eventBus = useEventBus();
  
  useEffect(() => {
    // 监听错误事件
    return eventBus.on("ERROR", (payload: EventPayload) => {
      const { message, type } = payload;
      
      toast.error(message || "操作发生错误");
      
      // 记录详细错误信息
      if (process.env.NODE_ENV !== "production") {
        console.error(`[${type || "ERROR"}]`, payload);
      }
    });
  }, [eventBus]);
}

// 通知事件处理
export function useNotificationEvents() {
  const eventBus = useEventBus();
  
  useEffect(() => {
    // 监听通知事件
    return eventBus.on("NOTIFICATION", (payload: EventPayload) => {
      const { message, type = "default" } = payload;
      
      if (type === "success") {
        toast.success(message);
      } else if (type === "error") {
        toast.error(message);
      } else {
        toast(message);
      }
    });
  }, [eventBus]);
}

// 文档变更事件处理
export function useDocumentChangeEvents(callback: (payload: EventPayload) => void) {
  const eventBus = useEventBus();
  
  useEffect(() => {
    // 监听文档变更事件
    return eventBus.on("DOCUMENT_CHANGE", callback);
  }, [callback, eventBus]);
} 