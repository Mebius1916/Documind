"use client";

import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { useParams } from "next/navigation";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { getUsers, getDocuments } from "./action";
import { toast } from "sonner";
import { Id } from "../../../../../convex/_generated/dataModel";
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "@/lib/margin";
import { useTracking } from "@/hooks/use-tracking";

type User = { id: string; name: string; avatar: string; color?: string };
type Document = { id: string; name: string };

// 🚀 智能协作频率控制Hook
const useAdaptiveThrottle = () => {
  const [currentThrottle, setCurrentThrottle] = useState(16);
  const lastActivityTime = useRef(Date.now());
  const isUserActive = useRef(true);
  const throttleTimer = useRef<NodeJS.Timeout>();

  // 🎯 根据用户活动动态调整频率
  const throttleSettings = {
    ACTIVE: 16,      // 活跃时：60fps
    IDLE: 50,        // 空闲时：20fps
    BACKGROUND: 100, // 后台时：10fps
    MAX_IDLE_TIME: 10000, // 10秒无活动视为空闲
  };

  const updateThrottleFrequency = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityTime.current;
    const isPageVisible = !document.hidden;

    let newThrottle;
    if (!isPageVisible) {
      newThrottle = throttleSettings.BACKGROUND;
      isUserActive.current = false;
    } else if (timeSinceActivity > throttleSettings.MAX_IDLE_TIME) {
      newThrottle = throttleSettings.IDLE;
      isUserActive.current = false;
    } else {
      newThrottle = throttleSettings.ACTIVE;
      isUserActive.current = true;
    }

    if (newThrottle !== currentThrottle) {
      setCurrentThrottle(newThrottle);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Throttle adjusted: ${currentThrottle}ms → ${newThrottle}ms`);
      }
    }
  }, [currentThrottle, throttleSettings]);

  // 🎯 监听用户活动
  useEffect(() => {
    const handleActivity = () => {
      lastActivityTime.current = Date.now();
      updateThrottleFrequency();
    };

    const handleVisibilityChange = () => {
      updateThrottleFrequency();
    };

    // 监听用户交互事件
    const events = ['keydown', 'mousedown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 定期检查并调整频率
    throttleTimer.current = setInterval(updateThrottleFrequency, 5000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (throttleTimer.current) {
        clearInterval(throttleTimer.current);
      }
    };
  }, [updateThrottleFrequency]);

  return {
    currentThrottle,
    isUserActive: isUserActive.current,
    throttleSettings
  };
};

// 🎯 用户解析优化Hook
const useOptimizedUserResolution = (users: User[]) => {
  const userCache = useRef(new Map());

  const resolveUsers = useCallback(async ({ userIds }: { userIds: string[] }) => {
    const uncachedIds = userIds.filter(id => !userCache.current.has(id));
    
    if (uncachedIds.length > 0 && users.length > 0) {
      // 批量解析未缓存的用户
      uncachedIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user) {
          userCache.current.set(id, {
            name: user.name,
            avatar: user.avatar,
            color: user.color,
          });
        }
      });
    }

    // 返回所有请求用户的信息
    return userIds.map(id => userCache.current.get(id)).filter(Boolean);
  }, [users]);

  return { resolveUsers };
};

// �� 提及建议优化Hook  
const useOptimizedMentionSuggestions = (users: User[]) => {
  const suggestionCache = useRef(new Map());

  const resolveMentionSuggestions = useCallback(async ({ text }: { text: string }) => {
    const cacheKey = text.toLowerCase();
    
    if (suggestionCache.current.has(cacheKey)) {
      return suggestionCache.current.get(cacheKey);
    }

    const suggestions = users
      .filter(user => 
        user.name.toLowerCase().includes(cacheKey) ||
        user.id.toLowerCase().includes(cacheKey)
      )
      .slice(0, 10) // 限制建议数量
      .map(user => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
      }));

    suggestionCache.current.set(cacheKey, suggestions);
    return suggestions;
  }, [users]);

  return { resolveMentionSuggestions };
};

export function Room({ children }: { children: ReactNode }) {
  const params = useParams();
  const documentId = params.documentId as string;
  const [users, setUsers] = useState<User[]>([]);

  // 🎯 添加协作行为追踪
  const { trackCollaboration, trackUser } = useTracking();
  const roomJoinTime = useRef<number>();
  const collaborationStarted = useRef(false);

  // 🚀 应用智能频率控制
  const { currentThrottle, isUserActive } = useAdaptiveThrottle();
  
  // 🔥 应用优化的用户解析
  const { resolveUsers } = useOptimizedUserResolution(users);
  
  // 🎯 应用优化的提及建议
  const { resolveMentionSuggestions } = useOptimizedMentionSuggestions(users);

  // 🔥 性能监控：用户数量变化
  const previousUserCount = useRef(0);
  useEffect(() => {
    if (users.length !== previousUserCount.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`👥 协作用户数量: ${users.length}`);
      }
      
      // 🎯 追踪协作用户数量变化
      if (users.length > 1 && !collaborationStarted.current) {
        collaborationStarted.current = true;
        trackCollaboration('join', documentId, {
          userCount: users.length,
          collaborationType: 'multi_user',
          timestamp: Date.now()
        });
      }
      
      previousUserCount.current = users.length;
    }
  }, [users.length, documentId, trackCollaboration]);

  // 🎯 追踪房间加入
  useEffect(() => {
    roomJoinTime.current = Date.now();
    
    trackCollaboration('join', documentId, {
      timestamp: roomJoinTime.current,
      userAgent: navigator.userAgent,
      collaborationType: 'room_join'
    });

    // 🎯 追踪房间离开
    return () => {
      if (roomJoinTime.current) {
        const sessionDuration = Date.now() - roomJoinTime.current;
        trackCollaboration('leave', documentId, {
          timestamp: Date.now(),
          sessionDuration,
          collaborationType: 'room_leave',
          totalUsers: users.length
        });
      }
    };
  }, [documentId, trackCollaboration, users.length]);

  // 获取当前组织所有用户数据
  useEffect(() => {
    (async () => {
      try {
        const list = await getUsers();
        setUsers(list);
        
        // 🎯 追踪用户列表加载
        trackUser('action', 'load_users', {
          userCount: list.length,
          documentId,
          timestamp: Date.now()
        });
      } catch {
        toast.error("Failed to fetch users");
        // 🎯 追踪错误
        trackUser('error', 'load_users_failed', {
          documentId,
          timestamp: Date.now()
        });
      }
    })();
  }, [documentId, trackUser]);

  // 🎯 优化的文档信息解析（减少不必要的网络请求）
  const resolveRoomsInfo = useCallback(async ({ roomIds }: { roomIds: string[] }) => {
    // 🔥 批量处理文档查询以提升性能
    try {
      const documents: Document[] = await getDocuments(roomIds as Id<"documents">[]);
      
      // 🎯 追踪文档信息解析
      trackUser('action', 'resolve_rooms', {
        roomCount: roomIds.length,
        resolvedCount: documents.length,
        timestamp: Date.now()
      });
      
      return documents.map((document) => ({
        id: document.id,
        name: document.name,
      }));
    } catch (error) {
      console.error('文档信息解析失败:', error);
      
      // 🎯 追踪解析错误
      trackUser('error', 'resolve_rooms_failed', {
        roomCount: roomIds.length,
        error: String(error),
        timestamp: Date.now()
      });
      
      return [];
    }
  }, [trackUser]);

  return (
    <LiveblocksProvider
      throttle={currentThrottle} // 🚀 动态频率控制
      //liveblocks鉴权
      authEndpoint={async () => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          body: JSON.stringify({ room: documentId }),
        });
        return await response.json();//返回鉴权令牌和用户信息
      }}

      //在数据库内根据当前在线协作users查找具体users信息
      resolveUsers={resolveUsers} // 🔥 优化的用户解析

      //@功能：在文档中输入@时，自动提示用户列表
      resolveMentionSuggestions={resolveMentionSuggestions} // 🎯 优化的提及建议

      //其他文档引用功能
      resolveRoomsInfo={resolveRoomsInfo} // 🔥 优化的文档信息解析
    >
      <RoomProvider
        id={documentId}
        initialStorage={{ 
          leftMargin: LEFT_MARGIN_DEFAULT, 
          rightMargin: RIGHT_MARGIN_DEFAULT 
        }}
      >
        <ClientSideSuspense
          fallback={<FullscreenLoader label="Room loading" />}
        >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
