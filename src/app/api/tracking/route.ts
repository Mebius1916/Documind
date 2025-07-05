import { NextRequest, NextResponse } from 'next/server';
import { TrackingEvent } from '@/types/tracking';
import { connectDB } from '@/lib/mongodb';
import { TrackingDB } from '@/models/tracking';

// 埋点数据存储接口
interface TrackingStorage {
  saveEvents(events: TrackingEvent[]): Promise<boolean>;
}

// MongoDB 存储实现
class MongoDBStorage implements TrackingStorage {
  async saveEvents(events: TrackingEvent[]): Promise<boolean> {
    try {
      await connectDB();
      const success = await TrackingDB.saveEvents(events);
      console.log('📊 [MongoDB存储]', events.length, '条埋点数据', success ? '成功' : '失败');
      return success;
    } catch (error) {
      console.error('MongoDB 埋点数据保存失败:', error);
      return false;
    }
  }
}

// 控制台存储（开发环境备用）
class ConsoleStorage implements TrackingStorage {
  async saveEvents(events: TrackingEvent[]): Promise<boolean> {
    console.log('📊 [控制台埋点数据]', {
      count: events.length,
      events: events.map(event => ({
        name: event.eventName,
        type: event.eventType,
        timestamp: new Date(event.timestamp).toISOString(),
        userId: event.userId,
        page: event.page.path,
        properties: event.properties,
        business: event.business,
      })),
    });
    return true;
  }
}

// 第三方分析平台存储（如 Google Analytics, 百度统计等）
class AnalyticsStorage implements TrackingStorage {
  async saveEvents(events: TrackingEvent[]): Promise<boolean> {
    try {
      // 这里可以发送到各种分析平台
      // 例如 Google Analytics 4, 百度统计, 神策分析等
      
      for (const event of events) {
        // 示例：发送到 GA4
        // gtag('event', event.eventName, {
        //   event_category: event.eventType,
        //   custom_parameter_1: event.properties?.customData,
        //   user_id: event.userId,
        // });
        
        // 示例：发送到自定义分析平台
        // await fetch('https://analytics.yourplatform.com/collect', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(event),
        // });
      }
      
      console.log('📈 [发送到分析平台]', events.length, '条数据');
      return true;
    } catch (error) {
      console.error('发送到分析平台失败:', error);
      return false;
    }
  }
}

// 存储策略管理器
class StorageManager {
  private storages: TrackingStorage[] = [];

  constructor() {
    // 优先使用 MongoDB 存储
    this.storages.push(new MongoDBStorage());
    
    // 开发环境额外添加控制台输出
    if (process.env.NODE_ENV === 'development') {
      this.storages.push(new ConsoleStorage());
    }
    
    // 生产环境可以同时使用第三方分析平台
    if (process.env.NODE_ENV === 'production') {
      this.storages.push(new AnalyticsStorage());
    }
  }

  async saveEvents(events: TrackingEvent[]): Promise<boolean> {
    const results = await Promise.allSettled(
      this.storages.map(storage => storage.saveEvents(events))
    );

    // 只要有一个存储成功就认为成功
    return results.some(result => 
      result.status === 'fulfilled' && result.value === true
    );
  }
}

const storageManager = new StorageManager();

// 请求频率限制
const requestLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // 每分钟最多100个请求
const RATE_WINDOW = 60 * 1000; // 1分钟

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = requestLimiter.get(ip);

  if (!limit || now > limit.resetTime) {
    requestLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

// 数据验证
function validateEvent(event: any): event is TrackingEvent {
  return (
    typeof event === 'object' &&
    typeof event.eventName === 'string' &&
    typeof event.eventType === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.sessionId === 'string' &&
    typeof event.page === 'object' &&
    typeof event.device === 'object'
  );
}

export async function POST(request: NextRequest) {
  try {
    // 获取客户端IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // 检查请求频率限制
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { events } = body;

    // 验证数据格式
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: '无效的数据格式，events必须是数组' },
        { status: 400 }
      );
    }

    // 验证每个事件的格式
    const validEvents = events.filter(validateEvent);
    
    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: '没有有效的埋点事件' },
        { status: 400 }
      );
    }

    // 过滤敏感信息（如果需要）
    const sanitizedEvents = validEvents.map(event => ({
      ...event,
      // 可以在这里添加数据清洗逻辑
      device: {
        ...event.device,
        // 移除可能的敏感设备信息
        userAgent: event.device.userAgent?.substring(0, 200), // 限制长度
      },
    }));

    // 保存埋点数据
    const success = await storageManager.saveEvents(sanitizedEvents);

    if (!success) {
      return NextResponse.json(
        { error: '埋点数据保存失败' },
        { status: 500 }
      );
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      processed: sanitizedEvents.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('埋点API错误:', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 支持 OPTIONS 请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 