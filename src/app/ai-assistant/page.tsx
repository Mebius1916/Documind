"use client";
import React, { useEffect, useRef, useState, useCallback, useTransition } from "react";
import Image from "next/image";
import { ChatInput } from "./components/chatInput";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import ChatMessages from "./components/chatMessage";
import { useSearchParams } from "@/hooks/use-search-params";
import { useTracking } from "@/hooks/use-tracking";

// AI聊天对话框组件
// initialQuery - 初始查询语句，组件加载时会自动发送
// initialContent - 初始化内容类型，用于控制界面元素显示
const ChatDialog = ({ initialContent }: any) => {
  const [initialQuery, setInitialQuery] = useSearchParams("search");
  
  // 🎯 添加AI交互追踪
  const { trackAI } = useTracking();
  const conversationStartTime = useRef<number>();
  const messageCount = useRef(0);
  const conversationId = useRef<string>();
  
  // 消息列表状态，包含初始欢迎信息
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `✨ 欢迎使用 Documind AI 助手！

**我能为您提供以下帮助：**
- 解答技术问题
- 分析文档内容
- 生成示例代码
- 进行创意写作

试试这些例子：
\`\`\`python
# 快速排序实现
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)
\`\`\`

💡 您可以直接输入问题，或粘贴需要分析的代码片段`,
    },
  ]);
  
  // 输入框状态
  const [input, setInput] = useState("");
  
  // 请求状态标识
  const [isFetching, setIsFetching] = useState(false);
  
  // 🔥 核心优化：useTransition 用于管理流式更新优先级
  // 确保用户输入不被频繁的消息更新阻塞
  const [startTransition] = useTransition();
  
  // 自动滚动相关配置
  const {
    messagesEndRef,    // 消息容器底部引用
    scrollToBottom,   // 滚动到底部方法
    canScroll,        // 是否允许自动滚动
    setCanScroll,     // 设置是否允许自动滚动
    timeoutRef,       // 滚动定时器引用
  } = useAutoScroll();
  
  // 初始化处理标识
  const initialProcessRef = useRef(false);

  // 🎯 AI对话会话开始追踪
  useEffect(() => {
    if (!conversationStartTime.current) {
      conversationStartTime.current = Date.now();
      conversationId.current = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      trackAI('start', {
        conversationId: conversationId.current,
        timestamp: conversationStartTime.current,
        source: initialContent === "Lassistant" ? 'document_sidebar' : 'main_page',
        initialQuery: initialQuery || null
      });
    }

    // 🎯 对话结束追踪
    return () => {
      if (conversationStartTime.current) {
        const sessionDuration = Date.now() - conversationStartTime.current;
        trackAI('end', {
          conversationId: conversationId.current,
          timestamp: Date.now(),
          sessionDuration,
          totalMessages: messageCount.current,
          source: initialContent === "Lassistant" ? 'document_sidebar' : 'main_page'
        });
      }
    };
  }, [trackAI, initialContent, initialQuery]);

  // 🎯 发送消息并处理AI响应
  const handleSend = useCallback(async (userMessage?: { role: string; content: string } | null) => {
    const messageToSend = userMessage || { role: "user", content: input };
    if (!messageToSend.content.trim() || isFetching) return;

    setIsFetching(true);
    setInput("");
    messageCount.current++;

    // 🎯 追踪用户消息发送
    trackAI('send', {
      conversationId: conversationId.current,
      messageLength: messageToSend.content.length,
      messageNumber: messageCount.current,
      timestamp: Date.now(),
      messageType: 'user'
    });

    // 立即添加用户消息到界面
    setMessages(prev => [...prev, messageToSend]);

    try {
      // 发送聊天请求到API（注意使用最新的 messages 状态）
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages.slice(-4), messageToSend],
        }),
      });

      // 🎯 追踪API响应状态
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      // 流式数据处理
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let streamStartTime = Date.now();
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        chunkCount++;
        // 解码并处理数据块
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data:")) {
            // 解析并处理消息内容
            const data = JSON.parse(line.slice(5).trim());
            const processedContent = data.content
              .replace(/<think>/g, ">\n> **深度思考开始**\n> ")
              .replace(/<\/think>/g, ">\n> **深度思考结束**\n> ");

            assistantMessage += processedContent;

            // 🎯 关键优化：流式更新作为非紧急更新
            // 确保用户输入不被频繁的消息更新阻塞
            startTransition(() => {
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === "assistant") {
                  return [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: assistantMessage },
                  ];
                }
                return [
                  ...prev,
                  { role: "assistant", content: assistantMessage },
                ];
              });
            });
          }
        }
      }

      // 🎯 追踪AI响应完成
      messageCount.current++;
      const responseTime = Date.now() - streamStartTime;
      
      trackAI('receive', {
        conversationId: conversationId.current,
        responseLength: assistantMessage.length,
        responseTime,
        chunkCount,
        messageNumber: messageCount.current,
        timestamp: Date.now(),
        messageType: 'assistant'
      });

    } catch (err) {
      console.log(err);
      
      // 🎯 追踪错误
      trackAI('error', {
        conversationId: conversationId.current,
        error: String(err),
        messageNumber: messageCount.current,
        timestamp: Date.now()
      });
      
      // 错误处理也使用transition，不阻塞用户操作
      startTransition(() => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "抱歉，发生了错误，请重试。" },
        ]);
      });
    } finally {
      setIsFetching(false);
    }
  }, [input, isFetching, messages, startTransition, trackAI]); 

  // 初始查询处理（组件加载时自动发送查询）
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && !initialProcessRef.current) {
      initialProcessRef.current = true;
      const autoAsk = async () => {
        const userMessage = { role: "user", content: initialQuery };
        
        // 🎯 追踪自动查询
        trackAI('send', {
          conversationId: conversationId.current,
          messageLength: initialQuery.length,
          messageNumber: 1,
          timestamp: Date.now(),
          messageType: 'auto_query',
          trigger: 'initial_search'
        });
        
        // 初始消息添加也使用transition
        startTransition(() => {
          setMessages((prev) => {
            if (prev.some((m) => m.content === initialQuery)) return prev;
            return [...prev, userMessage];
          });
        });
        await handleSend(userMessage);
        setInitialQuery("");
      };
      autoAsk();
    }
  }, [initialQuery, handleSend, setInitialQuery, startTransition, trackAI]); // 添加所有依赖

  return (
    <div className="flex-1 flex flex-col h-full p-0">
      {initialContent!=="Lassistant"&&(
        <div className="flex mx-auto mt-10">
          <Image src="/logo2.png" alt="Logo" width={100} height={100} />
        </div>
      )}
      <ChatMessages 
        messages={messages} 
        messagesEndRef={messagesEndRef} 
        initialContent={initialContent||""} 
      />
      <ChatInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isFetching={isFetching}
        initialContent={initialContent||""}
      />
    </div>
  );
};
export default ChatDialog;
