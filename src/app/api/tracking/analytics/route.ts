import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TrackingEventModel } from '@/models/tracking';

/**
 * 获取埋点数据分析
 * GET /api/tracking/analytics?type=overview&days=7
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('userId');
    const documentId = searchParams.get('documentId');

    let result = {};

    switch (type) {
      case 'overview':
        result = await getOverviewAnalytics(days);
        break;
      case 'user':
        if (!userId) {
          return NextResponse.json({ error: '需要提供用户ID' }, { status: 400 });
        }
        result = await getUserAnalytics(userId, days);
        break;
      case 'document':
        if (!documentId) {
          return NextResponse.json({ error: '需要提供文档ID' }, { status: 400 });
        }
        result = await getDocumentAnalytics(documentId, days);
        break;
      case 'realtime':
        result = await getRealtimeAnalytics();
        break;
      case 'performance':
        result = await getPerformanceAnalytics(days);
        break;
      default:
        return NextResponse.json({ error: '不支持的分析类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('分析API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取总览分析数据
 */
async function getOverviewAnalytics(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = startDate.getTime();

  // 基础统计
  const basicStats = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' },
        avgEventsPerSession: { $avg: 1 }
      }
    },
    {
      $project: {
        totalEvents: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueSessions: { $size: '$uniqueSessions' },
        avgEventsPerSession: 1
      }
    }
  ]);

  // 事件类型分布
  const eventTypeDistribution = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // 每日趋势
  const dailyTrend = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $toDate: '$timestamp' }
          }
        },
        events: { $sum: 1 },
        users: { $addToSet: '$userId' },
        sessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        date: '$_id',
        events: 1,
        users: { $size: '$users' },
        sessions: { $size: '$sessions' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  // 热门页面
  const topPages = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startTimestamp },
        eventType: 'page_view'
      }
    },
    {
      $group: {
        _id: '$page.path',
        views: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        path: '$_id',
        views: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { views: -1 }
    },
    {
      $limit: 10
    }
  ]);

  // 用户活跃时间分布
  const userActivity = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: {
          $hour: { $toDate: '$timestamp' }
        },
        users: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        hour: { $concat: [{ $toString: '$_id' }, ':00'] },
        users: { $size: '$users' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // AI交互统计
  const aiInteractions = await TrackingEventModel.aggregate([
    {
      $match: {
        eventType: 'ai_interaction',
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $toDate: '$timestamp' }
          }
        },
        conversations: { $addToSet: '$sessionId' },
        messages: { $sum: 1 }
      }
    },
    {
      $project: {
        date: '$_id',
        conversations: { $size: '$conversations' },
        messages: 1
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  return {
    basicStats: basicStats[0] || {
      totalEvents: 0,
      uniqueUsers: 0,
      uniqueSessions: 0,
      avgEventsPerSession: 0
    },
    eventTypeDistribution,
    dailyTrend,
    topPages,
    userActivity,
    aiInteractions
  };
}

/**
 * 获取用户行为分析
 */
async function getUserAnalytics(userId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = startDate.getTime();

  // 用户基础统计
  const userStats = await TrackingEventModel.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        sessions: { $addToSet: '$sessionId' },
        pages: { $addToSet: '$page.path' },
        documents: { $addToSet: '$business.documentId' }
      }
    },
    {
      $project: {
        totalEvents: 1,
        totalSessions: { $size: '$sessions' },
        uniquePages: { $size: '$pages' },
        documentsAccessed: { $size: '$documents' }
      }
    }
  ]);

  // 用户行为模式
  const behaviorPattern = await TrackingEventModel.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        avgDuration: { $avg: '$business.duration' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // 用户时间分布
  const timeDistribution = await TrackingEventModel.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: {
          $hour: { $toDate: '$timestamp' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  return {
    userStats: userStats[0] || {},
    behaviorPattern,
    timeDistribution
  };
}

/**
 * 获取文档分析数据
 */
async function getDocumentAnalytics(documentId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = startDate.getTime();

  // 文档基础统计
  const documentStats = await TrackingEventModel.aggregate([
    {
      $match: {
        'business.documentId': documentId,
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        editActions: {
          $sum: {
            $cond: [{ $eq: ['$eventName', 'document_edit'] }, 1, 0]
          }
        },
        viewActions: {
          $sum: {
            $cond: [{ $eq: ['$eventName', 'document_open'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        totalActions: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        editActions: 1,
        viewActions: 1
      }
    }
  ]);

  // 协作活动
  const collaborationActivity = await TrackingEventModel.aggregate([
    {
      $match: {
        'business.documentId': documentId,
        eventType: 'collaboration',
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: '$eventName',
        count: { $sum: 1 },
        users: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueUsers: { $size: '$users' }
      }
    }
  ]);

  return {
    documentStats: documentStats[0] || {},
    collaborationActivity
  };
}

/**
 * 获取实时分析数据
 */
async function getRealtimeAnalytics() {
  const now = Date.now();
  const lastHour = now - (60 * 60 * 1000);

  // 当前在线用户
  const currentOnlineUsers = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: lastHour }
      }
    },
    {
      $group: {
        _id: '$userId',
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $match: {
        lastActivity: { $gte: now - (5 * 60 * 1000) } // 5分钟内有活动
      }
    },
    {
      $count: 'onlineUsers'
    }
  ]);

  // 实时事件统计
  const realtimeEvents = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: lastHour }
      }
    },
    {
      $group: {
        _id: {
          $subtract: [
            { $divide: ['$timestamp', 300000] }, // 5分钟间隔
            { $mod: [{ $divide: ['$timestamp', 300000] }, 1] }
          ]
        },
        count: { $sum: 1 },
        timeSlot: { $min: '$timestamp' }
      }
    },
    {
      $sort: { timeSlot: 1 }
    },
    {
      $limit: 12 // 最近1小时，每5分钟一个数据点
    }
  ]);

  return {
    onlineUsers: currentOnlineUsers[0]?.onlineUsers || 0,
    realtimeEvents
  };
}

/**
 * 获取性能分析数据
 */
async function getPerformanceAnalytics(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = startDate.getTime();

  // 性能指标统计
  const performanceStats = await TrackingEventModel.aggregate([
    {
      $match: {
        eventType: 'performance',
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: '$properties.metric',
        avgValue: { $avg: '$properties.value' },
        minValue: { $min: '$properties.value' },
        maxValue: { $max: '$properties.value' },
        count: { $sum: 1 }
      }
    }
  ]);

  // 页面加载时间分布
  const loadTimeDistribution = await TrackingEventModel.aggregate([
    {
      $match: {
        eventName: 'performance_load',
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $bucket: {
        groupBy: '$properties.loadTime',
        boundaries: [0, 1000, 2000, 3000, 5000, 10000, Infinity],
        default: 'other',
        output: {
          count: { $sum: 1 },
          avgLoadTime: { $avg: '$properties.loadTime' }
        }
      }
    }
  ]);

  // 性能趋势数据
  const performanceTrend = await TrackingEventModel.aggregate([
    {
      $match: {
        eventType: 'performance',
        timestamp: { $gte: startTimestamp }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $toDate: '$timestamp' }
          }
        },
        loadTime: { $avg: '$properties.loadTime' },
        fcp: { $avg: '$properties.fcp' }
      }
    },
    {
      $project: {
        date: '$_id',
        loadTime: { $round: ['$loadTime', 0] },
        fcp: { $round: ['$fcp', 0] }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  return {
    performanceStats,
    loadTimeDistribution,
    performanceTrend
  };
} 