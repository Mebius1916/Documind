"use client";

import { useEvent } from "@/hooks/use-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * 全局事件监听器组件
 * 用于集中处理应用中的各种事件
 */
export const EventListener = () => {
  const router = useRouter();

  // 导航事件处理
  useEvent("NAVIGATE", (payload) => {
    if (payload.newTab) {
      window.open(payload.path, "_blank");
    } else if (payload.replace) {
      router.replace(payload.path);
    } else {
      router.push(payload.path);
    }
  });

  // 错误事件处理
  useEvent("ERROR", (payload) => {
    console.error("错误:", payload.message, payload.error);
    toast.error(payload.message);
  });

  // 通知事件处理
  useEvent("NOTIFICATION", (payload) => {
    switch (payload.type) {
      case "success":
        toast.success(payload.message, { duration: payload.duration });
        break;
      case "error":
        toast.error(payload.message, { duration: payload.duration });
        break;
      case "warning":
        toast.warning(payload.message, { duration: payload.duration });
        break;
      default:
        toast(payload.message, { duration: payload.duration });
    }
  });

  // 文档变更事件处理
  useEvent("DOCUMENT_CHANGE", (payload) => {
    console.log(`文档 ${payload.documentId} 已${payload.action}`);
    // 可以基于文档变更进行其他操作
  });

  return null; // 此组件不渲染任何内容
};

/**
 * 全局事件监听器提供者
 * 可以在此组件中添加其他全局提供者
 */
export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <EventListener />
      {children}
    </>
  );
}; 