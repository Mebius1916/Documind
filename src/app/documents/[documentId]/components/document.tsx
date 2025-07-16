"use client";
import { api } from "../../../../../convex/_generated/api";
import { Toolbar } from "./toolbar";
import { Navbar } from "./narbar";
import { Room } from "./room";
import {
  Preloaded,
  useMutation,
  usePreloadedQuery,
  useQuery,
} from "convex/react";
import { Ruler } from "./ruler";
import { useState, useCallback, useMemo, useEffect } from "react";
import ChatDialog from "@/app/ai-assistant/page";
import Image from "next/image";
import { Ellipsis, MessagesSquare, Send } from "lucide-react";
import Link from "next/link";
import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useTracking, usePageTracking } from "@/hooks/use-tracking";


// 🚀 动态加载优化：延迟加载编辑器以提升初始页面性能
const Editor = dynamic(() => import("./editor").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <Skeleton className="w-[816px] min-h-[1054px] mx-auto" />
});

interface DocumentProps {
  preloadedDocument: Preloaded<typeof api.documents.getById>;
  currentUser: {
    name: string | null | undefined;
    imageUrl?: string | null | undefined;
  };
}

export const Document = React.memo(
  ({ preloadedDocument, currentUser }: DocumentProps) => {
    const document = usePreloadedQuery(preloadedDocument);
    
    // 🎯 添加页面访问和业务操作追踪
    usePageTracking('document-editor');
    const { trackDocument, trackAI, trackUser } = useTracking();
    
    const [dialog, setDialog] = useState(false);
    const [chat, setChat] = useState(false);
    const [newMessage, setNewMessage] = useState("");

    // 🎯 文档打开追踪
    useEffect(() => {
      if (document?._id) {
        trackDocument('open', document._id, {
          documentTitle: document.title,
          organizationId: document.organizationId,
          openedAt: Date.now(),
          userRole: 'editor' // 可以根据实际权限判断
        });
      }
    }, [document?._id, document?.title, document?.organizationId, trackDocument]);

    // 获取聊天消息
    const messages = useQuery(api.chat.getRoomMessages, {
      organizationId: document.organizationId || "",
    });

    // 发送消息mutation
    const sendMessage = useMutation(api.chat.sendMessage);

    // 🔥 性能优化：优化消息发送处理
    const handleSendMessage = useCallback(async () => {
      if (!newMessage.trim()) return;
      
      // 🎯 追踪聊天消息发送
      trackUser('click', 'chat_send', {
        messageLength: newMessage.length,
        organizationId: document.organizationId,
        documentId: document._id
      });
      
      try {
        await sendMessage({
          content: newMessage,
          organizationId: document.organizationId || "",
          name: currentUser.name || "",
          imageUrl: currentUser.imageUrl || "",
        });
        setNewMessage("");
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    }, [newMessage, sendMessage, document.organizationId, document._id, currentUser, trackUser]);

    // 🎯 AI对话框操作追踪
    const handleAIDialogOpen = useCallback(() => {
      trackAI('start', {
        documentId: document._id,
        documentTitle: document.title,
        trigger: 'document_sidebar'
      });
      setDialog(true);
    }, [document._id, document.title, trackAI]);

    const handleAIDialogClose = useCallback(() => {
      trackAI('end', {
        documentId: document._id,
        trigger: 'close_button'
      });
      setDialog(false);
    }, [document._id, trackAI]);

    // 🎯 聊天界面操作追踪
    const handleChatOpen = useCallback(() => {
      trackUser('click', 'chat_open', {
        documentId: document._id,
        organizationId: document.organizationId
      });
      setChat(true);
    }, [document._id, document.organizationId, trackUser]);

    const handleChatClose = useCallback(() => {
      trackUser('click', 'chat_close', {
        documentId: document._id
      });
      setChat(false);
    }, [document._id, trackUser]);


    // 🔥 优化：缓存侧边栏渲染
    const sidebarContent = useMemo(() => (
      <div className="fixed right-2 bottom-4">
        <button
          onClick={handleAIDialogOpen}
          className="cursor-pointer bg-white shadow-lg h-32 mr-4 w-12 rounded-full flex flex-col items-center justify-center hover:shadow-xl transition-shadow"
        >
          <Image
            src="/logo3.png"
            alt="Logo"
            width={30}
            height={30}
            className="mb-1"
          />
          AI
          <br />
          助
          <br />手
        </button>
        <button
          onClick={handleChatOpen}
          className="bg-white w-12 h-12 rounded-full mt-3 flex items-center justify-center hover:shadow-lg transition-shadow"
        >
          <MessagesSquare size={20} color="#E4D1FF" />
        </button>
        <Link
          href="https://github.com/Mebius1916"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button 
            onClick={() => trackUser('click', 'github_link', { source: 'document_sidebar' })}
            className="bg-white w-12 h-12 rounded-full mt-3 flex items-center justify-center hover:shadow-lg transition-shadow"
          >
            <Ellipsis size={20} color="#E4D1FF" />
          </button>
        </Link>
      </div>
    ), [handleAIDialogOpen, handleChatOpen, trackUser]);

    const chatInterface = useMemo(() => {
      if (!chat) return null;

      return (
        <div
          className="fixed right-4 bottom-4 w-80 h-96 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col z-50"
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <span className="font-medium text-sm">团队聊天</span>
            <button
              onClick={handleChatClose}
              className="text-gray-500 hover:text-gray-700 text-lg font-bold"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages?.map((message, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  {message.imageUrl && (
                    <Image
                      src={message.imageUrl}
                      alt="User avatar"
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-medium text-xs text-gray-700">
                    {message.name}
                  </span>
                </div>
                <p className="text-gray-600">{message.content}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="输入消息..."
              className="flex-1 p-2 rounded-full border-none focus:outline-none focus:ring-0"
            />
            <button
              onClick={handleSendMessage}
              className="bg-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Send color="#5438E4" size={20} />
            </button>
          </div>
        </div>
      );
    }, [chat, messages, newMessage, handleSendMessage, handleChatClose]);

    // 🎯 优化：缓存AI对话框渲染
    const aiDialog = useMemo(() => {
      if (!dialog) return null;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-[90vw] h-[90vh] max-w-4xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">AI 助手</h2>
              <button
                onClick={handleAIDialogClose}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatDialog initialContent="Lassistant" />
            </div>
          </div>
        </div>
      );
    }, [dialog, handleAIDialogClose]);

    return (
      <Room>
        <div className="min-h-screen bg-blue-50">
          {/* 🔥 固定头部优化 */}
          <div className="flex flex-col fixed top-0 left-0 right-0 z-10 bg-blue-50 shadow-sm">
            <Navbar data={document} />
            <Toolbar />
            <Ruler />
          </div>
          
          {/* 内容区域 */}
          <div className="h-[100px]" />
          <div className="print:pt-0 flex">
            <Editor initialContent={document.initialContent} />
            
            {/* 🎯 侧边栏组件 */}
            {sidebarContent}
            
            {/* 🔥 聊天界面 */}
            {chatInterface}
            
            {/* 🚀 AI对话框 */}
            {aiDialog}
          </div>


        </div>
      </Room>
    );
  }
);

Document.displayName = 'Document';
