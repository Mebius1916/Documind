// 事件类型常量
export const EventType = {
  PAGE_VIEW: 'page_view',
  USER_ACTION: 'user_action',
  DOCUMENT_ACTION: 'document_action',
  AI_INTERACTION: 'ai_interaction',
  COLLABORATION: 'collaboration',
  SEARCH: 'search',
  ERROR: 'error',
  PERFORMANCE: 'performance',
};

// 事件名称常量
export const EventName = {
  // 页面事件
  PAGE_ENTER: 'page_enter',
  PAGE_LEAVE: 'page_leave',
  PAGE_SCROLL: 'page_scroll',
  
  // 用户行为
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  BUTTON_CLICK: 'button_click',
  
  // 文档操作
  DOCUMENT_CREATE: 'document_create',
  DOCUMENT_OPEN: 'document_open',
  DOCUMENT_EDIT: 'document_edit',
  DOCUMENT_SAVE: 'document_save',
  DOCUMENT_DELETE: 'document_delete',
  DOCUMENT_SHARE: 'document_share',
  
  // AI交互
  AI_CHAT_START: 'ai_chat_start',
  AI_CHAT_SEND: 'ai_chat_send',
  AI_CHAT_RECEIVE: 'ai_chat_receive',
  AI_CHAT_END: 'ai_chat_end',
  
  // 协作行为
  ROOM_JOIN: 'room_join',
  ROOM_LEAVE: 'room_leave',
  REAL_TIME_EDIT: 'real_time_edit',
  COMMENT_ADD: 'comment_add',
  MENTION_USER: 'mention_user',
  
  // 搜索
  SEARCH_QUERY: 'search_query',
  SEARCH_RESULT_CLICK: 'search_result_click',
  
  // 错误
  ERROR_JS: 'error_js',
  ERROR_API: 'error_api',
  ERROR_NETWORK: 'error_network',
  
  // 性能
  PERFORMANCE_LOAD: 'performance_load',
  PERFORMANCE_FCP: 'performance_fcp',
  PERFORMANCE_LCP: 'performance_lcp',
};

 