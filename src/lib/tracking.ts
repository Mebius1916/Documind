import { v4 as uuidv4 } from 'uuid';

// 埋点系统核心类
export class TrackingManager {
  config;
  sessionId;
  userId;
  organizationId;

  constructor(config = {}) {
    this.config = {
      enabled: true,
      apiEndpoint: '/api/tracking',
      debug: false,
      sampleRate: 1.0,
      ...config,
    };

    this.sessionId = uuidv4();
    this.userId = null;
    this.organizationId = null;
    this.init();
  }

  init() {
    if (!this.config.enabled || typeof window === 'undefined') return;

    // 页面卸载时发送剩余数据
    window.addEventListener('beforeunload', () => {
      this.flush();
      });

    // 页面隐藏时发送数据
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });

      // 自动错误追踪
        this.setupErrorTracking();
      }

  setUser(userId, organizationId) {
    this.userId = userId;
    this.organizationId = organizationId;
  }

  track(eventName, eventType, properties = {}, business = {}) {
    if (!this.config.enabled) return;

    // 采样率控制
    if (Math.random() > this.config.sampleRate) return;

    const event = {
      eventName,
      eventType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      organizationId: this.organizationId,
      page: this.getPageInfo(),
      device: this.getDeviceInfo(),
      properties,
      business,
    };

    this.sendEvent(event);

    if (this.config.debug) {
      console.log('埋点事件:', event);
    }
  }

  sendEvent(event) {
    if (typeof window === 'undefined' || !navigator.sendBeacon) return;

    const data = JSON.stringify({ events: [event] });
    const success = navigator.sendBeacon(this.config.apiEndpoint, data);

    if (this.config.debug) {
      console.log('发送结果:', success);
    }
  }

  // 批量发送多个事件
  sendEvents(events) {
    if (!events || events.length === 0) return;

    const data = JSON.stringify({ events });
    return navigator.sendBeacon(this.config.apiEndpoint, data);
  }

  flush() {
    // sendBeacon 是立即发送，不需要队列管理
    // 这个方法保留为接口兼容
  }

  getPageInfo() {
    if (typeof window === 'undefined') {
      return { path: '', title: '', referrer: '' };
    }

    return {
      path: window.location.pathname + window.location.search,
      title: document.title,
      referrer: document.referrer,
    };
  }

  getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        viewport: { width: 0, height: 0 },
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
      };
    }

    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  setupErrorTracking() {
    if (typeof window === 'undefined') return;

    // JavaScript 错误
    window.addEventListener('error', (event) => {
      this.track('error_js', 'error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      this.track('error_promise', 'error', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
      });
    });
  }

  destroy() {
    this.flush();
  }
}

// 全局实例
export const trackingManager = new TrackingManager(); 