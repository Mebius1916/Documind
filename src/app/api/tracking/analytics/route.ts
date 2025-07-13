import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TrackingEventModel, TrackingDB } from '@/models/tracking';

// 获取埋点数据分析
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('userId');
    const path = searchParams.get('path');

    let result = {};

    switch (type) {
      case 'overview':
        result = await getOverviewData(days);
        break;
      case 'user':
        if (!userId) {
          return NextResponse.json({ error: '需要提供用户ID' }, { status: 400 });
        }
        result = await TrackingDB.getUserEvents(userId, days);
        break;
      case 'page':
        if (!path) {
          return NextResponse.json({ error: '需要提供页面路径' }, { status: 400 });
        }
        result = await TrackingDB.getPageViews(path, days);
        break;
      case 'events':
        result = await TrackingDB.getEventTypeStats(days);
        break;
      case 'users':
        result = await TrackingDB.getActiveUsers(days);
        break;
      case 'realtime':
        result = await getRealtimeData();
        break;
      case 'performance':
        result = await getPerformanceData(days);
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

// 获取总览数据
async function getOverviewData(days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = startDate.getTime();

  // 计算对比期间（前一个相同时间段）
  const compareStartDate = new Date();
  compareStartDate.setDate(compareStartDate.getDate() - days * 2);
  const compareEndDate = new Date();
  compareEndDate.setDate(compareEndDate.getDate() - days);
  const compareStartTimestamp = compareStartDate.getTime();
  const compareEndTimestamp = compareEndDate.getTime();

  // 当前时间段的基础统计
  const currentStats = await getCurrentPeriodStats(startTimestamp);
  
  // 对比时间段的基础统计
  const compareStats = await getComparePeriodStats(compareStartTimestamp, compareEndTimestamp);

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

  // 每日趋势数据
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

  // 计算变化率
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous * 100).toFixed(1);
    return parseFloat(change) > 0 ? `+${change}%` : `${change}%`;
  };

  // 判断变化类型
  const getChangeType = (current, previous) => {
    if (current > previous) return 'positive';
    if (current < previous) return 'negative';
    return 'neutral';
  };

  // 计算平均每会话事件数
  const avgEventsPerSession = currentStats.uniqueSessions > 0 ? 
    (currentStats.totalEvents / currentStats.uniqueSessions).toFixed(1) : 0;
  
  const compareAvgEventsPerSession = compareStats.uniqueSessions > 0 ? 
    (compareStats.totalEvents / compareStats.uniqueSessions).toFixed(1) : 0;

  return {
    // 基础统计数据（包含变化信息）
    basicStats: {
      totalEvents: currentStats.totalEvents,
      uniqueUsers: currentStats.uniqueUsers,
      uniqueSessions: currentStats.uniqueSessions,
      avgEventsPerSession: parseFloat(avgEventsPerSession),
      // 变化数据
      changes: {
        totalEvents: {
          value: calculateChange(currentStats.totalEvents, compareStats.totalEvents),
          type: getChangeType(currentStats.totalEvents, compareStats.totalEvents)
        },
        uniqueUsers: {
          value: calculateChange(currentStats.uniqueUsers, compareStats.uniqueUsers),
          type: getChangeType(currentStats.uniqueUsers, compareStats.uniqueUsers)
        },
        uniqueSessions: {
          value: calculateChange(currentStats.uniqueSessions, compareStats.uniqueSessions),
          type: getChangeType(currentStats.uniqueSessions, compareStats.uniqueSessions)
        },
        avgEventsPerSession: {
          value: calculateChange(parseFloat(avgEventsPerSession), parseFloat(compareAvgEventsPerSession)),
          type: getChangeType(parseFloat(avgEventsPerSession), parseFloat(compareAvgEventsPerSession))
        }
      }
    },
    // 事件类型分布
    eventTypeDistribution,
    // 每日趋势
    dailyTrend,
    // 热门页面
    topPages,
    // 用户活跃时间分布  
    userActivity,
    // AI交互数据
    aiInteractions
  };
}

// 获取当前时间段统计
async function getCurrentPeriodStats(startTimestamp) {
  const totalEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp }
  });

  const uniqueUsers = await TrackingEventModel.distinct('userId', {
    timestamp: { $gte: startTimestamp },
    userId: { $ne: null }
  });

  const uniqueSessions = await TrackingEventModel.distinct('sessionId', {
    timestamp: { $gte: startTimestamp }
  });

  return {
    totalEvents,
    uniqueUsers: uniqueUsers.length,
    uniqueSessions: uniqueSessions.length
  };
}

// 获取对比时间段统计
async function getComparePeriodStats(startTimestamp, endTimestamp) {
  const totalEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp, $lt: endTimestamp }
  });

  const uniqueUsers = await TrackingEventModel.distinct('userId', {
    timestamp: { $gte: startTimestamp, $lt: endTimestamp },
    userId: { $ne: null }
  });

  const uniqueSessions = await TrackingEventModel.distinct('sessionId', {
    timestamp: { $gte: startTimestamp, $lt: endTimestamp }
  });

  return {
    totalEvents,
    uniqueUsers: uniqueUsers.length,
    uniqueSessions: uniqueSessions.length
  };
}

// 获取实时数据
async function getRealtimeData() {
  const now = Date.now();
  const lastHour = now - (60 * 60 * 1000); // 最近1小时
  const last5Minutes = now - (5 * 60 * 1000); // 最近5分钟

  // 在线用户数（5分钟内有活动）
  const onlineUsers = await TrackingEventModel.distinct('userId', {
    timestamp: { $gte: last5Minutes },
    userId: { $ne: null }
  });

  // 活跃会话数（5分钟内有活动）
  const activeSessions = await TrackingEventModel.distinct('sessionId', {
    timestamp: { $gte: last5Minutes }
  });

  // 最近1小时的事件统计
  const recentEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: lastHour }
  });

  // 实时事件类型分布
  const realtimeEventTypes = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: lastHour }
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

  // 最近活动（最新的10个事件）
  const recentActivity = await TrackingEventModel.find({
    timestamp: { $gte: lastHour }
  })
  .sort({ timestamp: -1 })
  .limit(10)
  .select('eventName eventType timestamp userId page.path');

  // 每5分钟的事件数量（最近1小时）
  const timeSeriesData = await TrackingEventModel.aggregate([
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
    onlineUsers: onlineUsers.length,
    activeSessions: activeSessions.length,
    recentEvents,
    realtimeEventTypes,
    recentActivity,
    timeSeriesData,
    timestamp: now
  };
}

// 获取性能数据
async function getPerformanceData(days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = startDate.getTime();

  // 计算对比期间
  const compareStartDate = new Date();
  compareStartDate.setDate(compareStartDate.getDate() - days * 2);
  const compareEndDate = new Date();
  compareEndDate.setDate(compareEndDate.getDate() - days);
  const compareStartTimestamp = compareStartDate.getTime();
  const compareEndTimestamp = compareEndDate.getTime();

  // 当前时间段的性能统计
  const currentPerfStats = await getCurrentPerformanceStats(startTimestamp);
  
  // 对比时间段的性能统计
  const comparePerfStats = await getComparePerformanceStats(compareStartTimestamp, compareEndTimestamp);

  // 模拟加载时间分布（实际项目中应该从真实性能数据计算）
  const loadTimeDistribution = [
    { _id: '0-1s', count: 245 },
    { _id: '1-2s', count: 189 },
    { _id: '2-3s', count: 156 },
    { _id: '3-5s', count: 98 },
    { _id: '5s+', count: 45 }
  ];

  // 模拟性能趋势（实际项目中应该从真实数据聚合）
  const performanceStats = await TrackingEventModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startTimestamp },
        eventType: 'performance'
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
        avgLoadTime: { $avg: '$properties.loadTime' },
        avgFCP: { $avg: '$properties.firstContentfulPaint' }
      }
    },
    {
      $project: {
        date: '$_id',
        loadTime: { $round: ['$avgLoadTime', 0] },
        fcp: { $round: ['$avgFCP', 0] }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  // 计算变化率
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous * 100).toFixed(1);
    return parseFloat(change) > 0 ? `+${change}%` : `${change}%`;
  };

  // 判断变化类型（对于性能指标，通常数值减少是好的）
  const getPerformanceChangeType = (current, previous, isGoodWhenLower = true) => {
    if (isGoodWhenLower) {
      if (current < previous) return 'positive'; // 减少是好的
      if (current > previous) return 'negative'; // 增加是坏的
    } else {
      if (current > previous) return 'positive'; // 增加是好的
      if (current < previous) return 'negative'; // 减少是坏的
    }
    return 'neutral';
  };

  // 计算基础性能指标
  const avgLoadTime = 2.1; // 模拟数据，实际应该从真实性能数据计算
  const compareAvgLoadTime = 2.3; // 模拟对比数据
  const avgFCP = 1.2; // 模拟数据
  const compareAvgFCP = 1.3; // 模拟对比数据
  const bounceRate = 15.4; // 模拟数据
  const compareBounceRate = 15.7; // 模拟对比数据

  return {
    performanceEvents: currentPerfStats.performanceEvents,
    errorEvents: currentPerfStats.errorEvents,
    totalEvents: currentPerfStats.totalEvents,
    errorRate: currentPerfStats.errorRate,
    avgLoadTime,
    avgFCP,
    bounceRate,
    loadTimeDistribution,
    performanceStats: performanceStats.length > 0 ? performanceStats : [
      { date: '2024-01-01', loadTime: 2100, fcp: 1200 },
      { date: '2024-01-02', loadTime: 1980, fcp: 1150 },
      { date: '2024-01-03', loadTime: 2050, fcp: 1180 }
    ],
    // 添加变化数据
    changes: {
      avgLoadTime: {
        value: calculateChange(avgLoadTime, compareAvgLoadTime),
        type: getPerformanceChangeType(avgLoadTime, compareAvgLoadTime, true)
      },
      avgFCP: {
        value: calculateChange(avgFCP, compareAvgFCP),
        type: getPerformanceChangeType(avgFCP, compareAvgFCP, true)
      },
      errorRate: {
        value: calculateChange(currentPerfStats.errorRate, comparePerfStats.errorRate),
        type: getPerformanceChangeType(currentPerfStats.errorRate, comparePerfStats.errorRate, true)
      },
      bounceRate: {
        value: calculateChange(bounceRate, compareBounceRate),
        type: getPerformanceChangeType(bounceRate, compareBounceRate, true)
      }
    }
  };
}

// 获取当前时间段性能统计
async function getCurrentPerformanceStats(startTimestamp) {
  const performanceEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp },
    eventType: 'performance'
  });

  const errorEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp },
    eventType: 'error'
  });

  const totalEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp }
  });

  const errorRate = totalEvents > 0 ? parseFloat(((errorEvents / totalEvents) * 100).toFixed(2)) : 0;

  return {
    performanceEvents,
    errorEvents,
    totalEvents,
    errorRate
  };
}

// 获取对比时间段性能统计
async function getComparePerformanceStats(startTimestamp, endTimestamp) {
  const performanceEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp, $lt: endTimestamp },
    eventType: 'performance'
  });

  const errorEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp, $lt: endTimestamp },
    eventType: 'error'
  });

  const totalEvents = await TrackingEventModel.countDocuments({
    timestamp: { $gte: startTimestamp, $lt: endTimestamp }
  });

  const errorRate = totalEvents > 0 ? parseFloat(((errorEvents / totalEvents) * 100).toFixed(2)) : 0;

  return {
    performanceEvents,
    errorEvents,
    totalEvents,
    errorRate
  };
} 