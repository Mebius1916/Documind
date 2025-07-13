import mongoose, { Schema } from 'mongoose';

// 基础埋点事件模型
const TrackingEventSchema = new Schema({
  eventName: { 
    type: String, 
    required: true, 
    index: true 
  },
  eventType: { 
    type: String, 
    required: true,
    index: true 
  },
  timestamp: { 
    type: Number, 
    required: true, 
    index: true 
  },
  sessionId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    index: true
  },
  organizationId: { 
    type: String, 
    index: true
  },
  page: {
    path: String,
    title: String,
    referrer: String
  },
  device: {
    userAgent: String,
    viewport: {
      width: Number,
      height: Number
    },
    language: String,
    timezone: String
  },
  properties: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  business: {
    documentId: String,
    roomId: String,
    actionTarget: String,
    actionValue: Schema.Types.Mixed,
    duration: Number
  }
}, {
  timestamps: true,
  collection: 'tracking_events'
});

// 基础索引
TrackingEventSchema.index({ eventType: 1, timestamp: -1 });
TrackingEventSchema.index({ userId: 1, timestamp: -1 });
TrackingEventSchema.index({ sessionId: 1, timestamp: -1 });

// 数据自动过期：90天后删除
TrackingEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// 创建模型
export const TrackingEventModel = 
  mongoose.models.TrackingEvent || mongoose.model('TrackingEvent', TrackingEventSchema);

// 数据库操作类
export class TrackingDB {
  // 保存埋点事件
  static async saveEvents(events) {
    try {
      await TrackingEventModel.insertMany(events);
      return true;
    } catch (error) {
      console.error('保存埋点事件失败:', error);
      return false;
    }
  }

  // 查询事件
  static async getEvents(filter = {}, limit = 1000) {
    try {
      return await TrackingEventModel.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error('查询埋点事件失败:', error);
      return [];
    }
  }

  // 获取用户行为
  static async getUserEvents(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await TrackingEventModel.find({
      userId,
      timestamp: { $gte: startDate.getTime() }
    }).sort({ timestamp: -1 });
  }

  // 获取页面访问数据
  static async getPageViews(path, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await TrackingEventModel.find({
      'page.path': path,
      eventType: 'page_view',
      timestamp: { $gte: startDate.getTime() }
    }).sort({ timestamp: -1 });
  }

  // 统计事件类型分布
  static async getEventTypeStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await TrackingEventModel.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate.getTime() }
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
  }

  // 获取活跃用户数
  static async getActiveUsers(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await TrackingEventModel.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate.getTime() },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 }
        }
      }
    ]);

    return result.length;
  }
} 