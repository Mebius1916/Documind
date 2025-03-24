"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { ChatInput } from "./components/chatInput";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import ChatMessages from "./components/chatMessage";
import { useSearchParams } from "@/hooks/use-search-params";
import { useHydration } from "@/hooks/useHydration";
// AI聊天对话框组件
// initialQuery - 初始查询语句，组件加载时会自动发送
// initialContent - 初始化内容类型，用于控制界面元素显示
const ChatDialog = ({ initialContent }: any) => {
  const [initialQuery,setInitialQuery] = useSearchParams("search");
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
  
  // 自动滚动相关配置
  const {
    messagesEndRef,    // 消息容器底部引用
    scrollToBottom,   // 滚动到底部方法
    setCanScroll,     // 设置是否允许自动滚动
    timeoutRef,       // 滚动定时器引用
  } = useAutoScroll();
  
  // 初始请求处理标识（防止重复处理）
  const initialProcessRef = useRef(false);

  const { isHydrated } = useHydration();

  // 消息变化时自动滚动处理
  useEffect(() => {
    if (!isHydrated) return;
    
    const currentTimeoutRef = timeoutRef.current;
    if (messages.length > 1) {
      scrollToBottom();
    }
    return () => {
      currentTimeoutRef && clearTimeout(currentTimeoutRef);
    };
  }, [messages, scrollToBottom, isHydrated]);

  // 发送消息处理函数
  const handleSend = useCallback(async (message?: { role: string; content: string }) => {
    // 准备消息内容
    const userMessage = message || { role: "user", content: input };
    if (!userMessage.content.trim()) return;
    if (isFetching) return;
    
    // 更新消息列表
    setMessages((prev) => {
      if (prev.some((m) => m.content === userMessage.content)) return prev;
      return [...prev, userMessage];
    });

    // 清空输入框（非预设消息时）
    if (!message) setInput("");
    setIsFetching(true);
    setCanScroll(true);

    try {
      // 发送聊天请求到API（注意使用最新的 messages 状态）
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages.slice(-4), userMessage],
        }),
      });

      // 流式数据处理
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

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

            // 更新助手消息内容
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
          }
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsFetching(false);
    }
  }, [input, isFetching, messages, setCanScroll]); 

  // 初始查询处理（组件加载时自动发送查询）
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && !initialProcessRef.current) {
      initialProcessRef.current = true;
      const autoAsk = async () => {
        const userMessage = { role: "user", content: initialQuery };
        setMessages((prev) => {
          if (prev.some((m) => m.content === initialQuery)) return prev;
          return [...prev, userMessage];
        });
        await handleSend(userMessage);
        setInitialQuery("");
      };
      autoAsk();
    }
  }, [initialQuery, handleSend]); // 添加 handleSend 作为依赖

  return (
    <div className="flex-1 flex flex-col h-full p-0">
      {initialContent!=="Lassistant"&&(
        <div className="flex mx-auto mt-10">
          <Image src="/logo2.png" alt="Logo" width={100} height={100} />
        </div>
      )}
      <ChatMessages messages={messages} messagesEndRef={messagesEndRef} initialContent={initialContent||""} />
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
