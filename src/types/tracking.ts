// 埋点事件类型定义
export interface TrackingEvent {
  // 基础字段
  eventName: string;
  eventType: EventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
  organizationId?: string;
  
  // 页面信息
  page: {
    path: string;
    title: string;
    referrer: string;
  };
  
  // 设备信息
  device: {
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
    language: string;
    timezone: string;
  };
  
  // 自定义属性
  properties?: Record<string, any>;
  
  // 业务数据
  business?: {
    documentId?: string;
    roomId?: string;
    actionTarget?: string;
    actionValue?: string | number;
    duration?: number;
  };
}

// 事件类型枚举
export enum EventType {
  PAGE_VIEW = 'page_view',           // 页面访问
  USER_ACTION = 'user_action',       // 用户操作
  DOCUMENT_ACTION = 'document_action', // 文档操作
  AI_INTERACTION = 'ai_interaction',   // AI交互
  COLLABORATION = 'collaboration',     // 协作行为
  SEARCH = 'search',                  // 搜索行为
  ERROR = 'error',                    // 错误事件
  PERFORMANCE = 'performance',         // 性能指标
}

// 预定义事件名称
export enum EventName {
  // 页面事件
  PAGE_ENTER = 'page_enter',
  PAGE_LEAVE = 'page_leave',
  PAGE_SCROLL = 'page_scroll',
  
  // 用户行为
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  BUTTON_CLICK = 'button_click',
  
  // 文档操作
  DOCUMENT_CREATE = 'document_create',
  DOCUMENT_OPEN = 'document_open',
  DOCUMENT_EDIT = 'document_edit',
  DOCUMENT_SAVE = 'document_save',
  DOCUMENT_DELETE = 'document_delete',
  DOCUMENT_SHARE = 'document_share',
  DOCUMENT_SEARCH = 'document_search',
  
  // AI交互
  AI_CHAT_START = 'ai_chat_start',
  AI_CHAT_SEND = 'ai_chat_send',
  AI_CHAT_RECEIVE = 'ai_chat_receive',
  AI_CHAT_END = 'ai_chat_end',
  
  // 协作行为
  ROOM_JOIN = 'room_join',
  ROOM_LEAVE = 'room_leave',
  REAL_TIME_EDIT = 'real_time_edit',
  COMMENT_ADD = 'comment_add',
  MENTION_USER = 'mention_user',
  
  // 搜索
  SEARCH_QUERY = 'search_query',
  SEARCH_RESULT_CLICK = 'search_result_click',
  
  // 错误
  ERROR_JS = 'error_js',
  ERROR_API = 'error_api',
  ERROR_NETWORK = 'error_network',
  
  // 性能
  PERFORMANCE_LOAD = 'performance_load',
  PERFORMANCE_FCP = 'performance_fcp',
  PERFORMANCE_LCP = 'performance_lcp',
}

// 埋点配置
export interface TrackingConfig {
  enabled: boolean;
  apiEndpoint: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  debug: boolean;
  enableAutoTrack: boolean;
  enablePerformanceTrack: boolean;
  enableErrorTrack: boolean;
  enableConsoleLog: boolean;
  sampleRate: number; // 采样率 0-1
}

// 埋点队列项
export interface TrackingQueueItem {
  event: TrackingEvent;
  retryCount: number;
  timestamp: number;
}

// 埋点结果
export interface TrackingResult {
  success: boolean;
  error?: string;
  eventId?: string;
} 