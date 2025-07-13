import { useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { trackingManager } from '@/lib/tracking';
import { EventType, EventName } from '@/types/tracking';

// 主要的埋点 Hook
export const useTracking = () => {
  const { user } = useUser();
  const pathname = usePathname();
  const pageEnterTime = useRef(Date.now());
  const isInitialized = useRef(false);

  // 初始化用户信息
  useEffect(() => {
    if (user && !isInitialized.current) {
      trackingManager.setUser(
        user.id,
        user.organizationMemberships?.[0]?.organization?.id
      );
      isInitialized.current = true;
    }
  }, [user]);

  // 页面访问追踪
  useEffect(() => {
    pageEnterTime.current = Date.now();
    
    // 页面进入事件
    trackingManager.track(EventName.PAGE_ENTER, EventType.PAGE_VIEW, {
      path: pathname,
      userAgent: navigator.userAgent,
      timestamp: pageEnterTime.current,
    });

    // 页面离开事件
    return () => {
      const duration = Date.now() - pageEnterTime.current;
      trackingManager.track(EventName.PAGE_LEAVE, EventType.PAGE_VIEW, {
        path: pathname,
        duration,
        timestamp: Date.now(),
      });
    };
  }, [pathname]);

  // 基础埋点方法
  const track = useCallback((eventName, eventType, properties = {}, business = {}) => {
      trackingManager.track(eventName, eventType, properties, business);
  }, []);

  // 文档操作追踪
  const trackDocument = useCallback((action, documentId, properties = {}) => {
      const eventMap = {
        create: EventName.DOCUMENT_CREATE,
        open: EventName.DOCUMENT_OPEN,
        edit: EventName.DOCUMENT_EDIT,
        save: EventName.DOCUMENT_SAVE,
        delete: EventName.DOCUMENT_DELETE,
        share: EventName.DOCUMENT_SHARE,
      };

    track(eventMap[action], EventType.DOCUMENT_ACTION, {
          action,
          ...properties,
    }, {
          documentId,
          actionTarget: 'document',
          actionValue: action,
    });
  }, [track]);

  // AI 交互追踪
  const trackAI = useCallback((action, properties = {}) => {
      const eventMap = {
        start: EventName.AI_CHAT_START,
        send: EventName.AI_CHAT_SEND,
        receive: EventName.AI_CHAT_RECEIVE,
        end: EventName.AI_CHAT_END,
      };

    track(eventMap[action], EventType.AI_INTERACTION, {
          action,
          timestamp: Date.now(),
          ...properties,
    }, {
          actionTarget: 'ai_chat',
          actionValue: action,
    });
  }, [track]);

  // 协作行为追踪
  const trackCollaboration = useCallback((action, roomId, properties = {}) => {
      const eventMap = {
        join: EventName.ROOM_JOIN,
        leave: EventName.ROOM_LEAVE,
        edit: EventName.REAL_TIME_EDIT,
        comment: EventName.COMMENT_ADD,
        mention: EventName.MENTION_USER,
      };

    track(eventMap[action], EventType.COLLABORATION, {
          action,
          ...properties,
    }, {
          roomId,
          actionTarget: 'collaboration',
          actionValue: action,
    });
  }, [track]);

  // 搜索行为追踪
  const trackSearch = useCallback((query, resultCount, resultClicked, properties = {}) => {
      if (resultClicked) {
      track(EventName.SEARCH_RESULT_CLICK, EventType.SEARCH, {
            query,
            clickedResult: resultClicked,
            ...properties,
      }, {
            actionTarget: 'search_result',
            actionValue: resultClicked,
      });
      } else {
      track(EventName.SEARCH_QUERY, EventType.SEARCH, {
            query,
            resultCount,
            ...properties,
      }, {
            actionTarget: 'search',
            actionValue: query,
      });
      }
  }, [track]);

  // 用户行为追踪
  const trackUser = useCallback((action, target, properties = {}) => {
      const eventMap = {
        login: EventName.USER_LOGIN,
        logout: EventName.USER_LOGOUT,
        click: EventName.BUTTON_CLICK,
      };

    track(eventMap[action], EventType.USER_ACTION, {
          action,
          target,
          ...properties,
    }, {
          actionTarget: target || action,
          actionValue: action,
    });
  }, [track]);

  return {
    track,
    trackDocument,
    trackAI,
    trackCollaboration,
    trackSearch,
    trackUser,
  };
};

// 页面访问追踪 Hook
export const usePageTracking = (pageName) => {
  const pathname = usePathname();
  const { track } = useTracking();
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    
    track(EventName.PAGE_ENTER, EventType.PAGE_VIEW, {
      pageName: pageName || pathname,
      enterTime: startTime.current,
    });

    return () => {
      const duration = Date.now() - startTime.current;
      track(EventName.PAGE_LEAVE, EventType.PAGE_VIEW, {
        pageName: pageName || pathname,
        duration,
        leaveTime: Date.now(),
      });
    };
  }, [pathname, pageName, track]);
};

// 点击事件追踪 Hook
export const useClickTracking = (elementName, properties = {}) => {
  const { trackUser } = useTracking();

  const handleClick = useCallback((event) => {
      trackUser('click', elementName, {
        ...properties,
        targetElement: event.currentTarget.tagName,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
  }, [trackUser, elementName, properties]);

  return { onClick: handleClick };
};

// 滚动追踪 Hook
export const useScrollTracking = (threshold = 25) => {
  const { track } = useTracking();
  const lastScrollPercent = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercent >= lastScrollPercent.current + threshold) {
        lastScrollPercent.current = scrollPercent;
        track(EventName.PAGE_SCROLL, EventType.PAGE_VIEW, {
          scrollPercent,
          scrollY: window.scrollY,
          documentHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight,
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [track, threshold]);
};

// 表单追踪 Hook
export const useFormTracking = (formName) => {
  const { track } = useTracking();

  const trackFormStart = useCallback(() => {
    track('form_start', EventType.USER_ACTION, {
      formName,
      startTime: Date.now(),
    });
  }, [track, formName]);

  const trackFormSubmit = useCallback((success, errors) => {
    track('form_submit', EventType.USER_ACTION, {
      formName,
      success,
      errors,
      submitTime: Date.now(),
    });
  }, [track, formName]);

  const trackFieldFocus = useCallback((fieldName) => {
    track('form_field_focus', EventType.USER_ACTION, {
      formName,
      fieldName,
      focusTime: Date.now(),
    });
  }, [track, formName]);

  const trackFieldBlur = useCallback((fieldName, value) => {
    track('form_field_blur', EventType.USER_ACTION, {
      formName,
      fieldName,
      hasValue: !!value,
      blurTime: Date.now(),
    });
  }, [track, formName]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldFocus,
    trackFieldBlur,
  };
}; 