import { v4 as uuidv4 } from 'uuid';
import { 
  TrackingEvent, 
  TrackingConfig, 
  TrackingQueueItem, 
  TrackingResult,
  EventType 
} from '@/types/tracking';

/**
 * 埋点系统核心类
 * 负责事件收集、队列管理、批量上报等功能
 */
export class TrackingManager {
  private config: TrackingConfig;
  private queue: TrackingQueueItem[] = [];
  private sessionId: string;
  private userId?: string;
  private organizationId?: string;
  private flushTimer?: NodeJS.Timeout;
  private isOnline: boolean = true;

  constructor(config: Partial<TrackingConfig> = {}) {
    // 默认配置
    this.config = {
      enabled: true,
      apiEndpoint: '/api/tracking',
      batchSize: 10,
      flushInterval: 5000, // 5秒
      maxRetries: 3,
      debug: process.env.NODE_ENV === 'development',
      enableAutoTrack: true,
      enablePerformanceTrack: true,
      enableErrorTrack: true,
      enableConsoleLog: false,
      sampleRate: 1.0,
      ...config,
    };

    this.sessionId = uuidv4();
    this.initializeTracking();
  }

  /**
   * 初始化埋点系统
   */
  private initializeTracking() {
    if (!this.config.enabled) return;

    // 监听网络状态
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushQueue(); // 网络恢复后立即上报
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // 页面卸载前上报队列
      window.addEventListener('beforeunload', () => {
        this.flushQueue(true);
      });

      // 启动定时器
      this.startFlushTimer();

      // 自动错误追踪
      if (this.config.enableErrorTrack) {
        this.setupErrorTracking();
      }

      // 性能追踪
      if (this.config.enablePerformanceTrack) {
        this.setupPerformanceTracking();
      }
    }
  }

  /**
   * 设置用户信息
   */
  setUser(userId: string, organizationId?: string) {
    this.userId = userId;
    this.organizationId = organizationId;
  }

  /**
   * 追踪事件
   */
  track(
    eventName: string,
    eventType: EventType,
    properties?: Record<string, any>,
    business?: TrackingEvent['business']
  ): void {
    if (!this.config.enabled) return;

    // 采样率控制
    if (Math.random() > this.config.sampleRate) return;

    const event = this.createEvent(eventName, eventType, properties, business);
    this.addToQueue(event);

    if (this.config.debug) {
      console.log('🔍 [Tracking]', event);
    }
  }

  /**
   * 创建事件对象
   */
  private createEvent(
    eventName: string,
    eventType: EventType,
    properties?: Record<string, any>,
    business?: TrackingEvent['business']
  ): TrackingEvent {
    const event: TrackingEvent = {
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

    return event;
  }

  /**
   * 获取页面信息
   */
  private getPageInfo() {
    if (typeof window === 'undefined') {
      return { path: '', title: '', referrer: '' };
    }

    return {
      path: window.location.pathname + window.location.search,
      title: document.title,
      referrer: document.referrer,
    };
  }

  /**
   * 获取设备信息
   */
  private getDeviceInfo() {
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

  /**
   * 添加事件到队列
   */
  private addToQueue(event: TrackingEvent) {
    const queueItem: TrackingQueueItem = {
      event,
      retryCount: 0,
      timestamp: Date.now(),
    };

    this.queue.push(queueItem);

    // 队列满了立即上报
    if (this.queue.length >= this.config.batchSize) {
      this.flushQueue();
    }
  }

  /**
   * 启动定时上报
   */
  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, this.config.flushInterval);
  }

  /**
   * 上报队列中的事件
   */
  async flushQueue(immediate = false): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const eventsToSend = this.queue.splice(0, this.config.batchSize);
    
    try {
      const result = await this.sendEvents(eventsToSend.map(item => item.event), immediate);
      
      if (!result.success) {
        // 失败的事件重新加入队列并增加重试次数
        const retryEvents = eventsToSend
          .filter(item => item.retryCount < this.config.maxRetries)
          .map(item => ({ ...item, retryCount: item.retryCount + 1 }));
        
        this.queue.unshift(...retryEvents);
      }
    } catch (error) {
      console.error('埋点上报失败:', error);
      
      // 重试逻辑
      const retryEvents = eventsToSend
        .filter(item => item.retryCount < this.config.maxRetries)
        .map(item => ({ ...item, retryCount: item.retryCount + 1 }));
      
      this.queue.unshift(...retryEvents);
    }
  }

  /**
   * 发送事件到服务器
   */
  private async sendEvents(events: TrackingEvent[], immediate = false): Promise<TrackingResult> {
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    };

    // 如果是立即发送（页面卸载），使用 sendBeacon
    if (immediate && navigator.sendBeacon && typeof window !== 'undefined') {
      const success = navigator.sendBeacon(
        this.config.apiEndpoint,
        requestOptions.body as string
      );
      return { success };
    }

    const response = await fetch(this.config.apiEndpoint, requestOptions);
    
    if (!response.ok) {
      throw new Error(`埋点上报失败: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, ...result };
  }

  /**
   * 设置错误追踪
   */
  private setupErrorTracking() {
    if (typeof window === 'undefined') return;

    // JavaScript 错误
    window.addEventListener('error', (event) => {
      this.track('error_js', EventType.ERROR, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      this.track('error_promise', EventType.ERROR, {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
      });
    });
  }

  /**
   * 设置性能追踪
   */
  private setupPerformanceTracking() {
    if (typeof window === 'undefined') return;

    // 页面加载性能
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (perfData) {
          this.track('performance_load', EventType.PERFORMANCE, {
            loadTime: perfData.loadEventEnd - perfData.loadEventStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint(),
          });
        }
      }, 1000);
    });
  }

  /**
   * 获取首次绘制时间
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fpEntry = paintEntries.find(entry => entry.name === 'first-paint');
    return fpEntry ? fpEntry.startTime : 0;
  }

  /**
   * 获取首次内容绘制时间
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  /**
   * 销毁埋点系统
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushQueue(true); // 最后一次上报
  }
}

// 全局埋点实例
export const trackingManager = new TrackingManager(); 