import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TrackingDB } from '@/models/tracking';

// 请求频率限制
const requestLimiter = new Map();
const RATE_LIMIT = 200; // 每分钟最多200个请求
const RATE_WINDOW = 60 * 1000; // 1分钟

function checkRateLimit(ip) {
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

// 验证事件数据
function validateEvent(event) {
  return (
    event &&
    typeof event === 'object' &&
    typeof event.eventName === 'string' &&
    typeof event.eventType === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.sessionId === 'string' &&
    typeof event.page === 'object' &&
    typeof event.device === 'object'
  );
}

export async function POST(request) {
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
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: '无效的数据格式' },
        { status: 400 }
      );
    }

    // 验证每个事件
    const validEvents = events.filter(validateEvent);
    
    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: '没有有效的埋点事件' },
        { status: 400 }
      );
    }

    // 保存到数据库
    await connectDB();
    const success = await TrackingDB.saveEvents(validEvents);

    if (!success) {
      console.error('埋点数据保存失败');
      return NextResponse.json(
        { error: '数据保存失败' },
        { status: 500 }
      );
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      processed: validEvents.length,
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