import mongoose, { Schema, Document, Model } from 'mongoose';
import { TrackingEvent, EventType } from '@/types/tracking';

// MongoDB 文档接口，继承 TrackingEvent 和 Document
export interface ITrackingEvent extends TrackingEvent, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 页面信息子模式
const PageSchema = new Schema({
  path: { type: String, required: true, index: true },
  title: { type: String, required: true },
  referrer: { type: String, default: '' }
}, { _id: false });

// 设备信息子模式
const DeviceSchema = new Schema({
  userAgent: { type: String, required: true },
  viewport: {
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  language: { type: String, required: true, default: 'zh-CN' },
  timezone: { type: String, required: true, default: 'Asia/Shanghai' }
}, { _id: false });

// 业务数据子模式
const BusinessSchema = new Schema({
  documentId: { type: String, index: true },
  roomId: { type: String, index: true },
  actionTarget: { type: String, index: true },
  actionValue: { type: Schema.Types.Mixed },
  duration: { type: Number }
}, { _id: false });

// 主埋点事件模式
const TrackingEventSchema = new Schema<ITrackingEvent>({
  // 基础字段
  eventName: { 
    type: String, 
    required: true, 
    index: true 
  },
  eventType: { 
    type: String, 
    required: true, 
    enum: Object.values(EventType),
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
    index: true,
    sparse: true // 允许 null 值建立稀疏索引
  },
  organizationId: { 
    type: String, 
    index: true,
    sparse: true
  },

  // 页面和设备信息
  page: { 
    type: PageSchema, 
    required: true 
  },
  device: { 
    type: DeviceSchema, 
    required: true 
  },

  // 自定义属性
  properties: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },

  // 业务数据
  business: { 
    type: BusinessSchema 
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  collection: 'tracking_events' // 指定集合名称
});

// 复合索引
TrackingEventSchema.index({ eventType: 1, timestamp: -1 });
TrackingEventSchema.index({ userId: 1, timestamp: -1 });
TrackingEventSchema.index({ sessionId: 1, timestamp: -1 });
TrackingEventSchema.index({ 'business.documentId': 1, timestamp: -1 });
TrackingEventSchema.index({ 'page.path': 1, eventType: 1 });

// 时间范围索引（用于数据清理）
TrackingEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90天后自动删除

// 用户会话聚合模式
const UserSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, index: true },
  organizationId: { type: String, index: true },
  
  // 会话统计
  sessionStart: { type: Date, required: true },
  sessionEnd: { type: Date },
  duration: { type: Number }, // 毫秒
  
  // 访问统计
  pageViews: { type: Number, default: 0 },
  uniquePages: [{ type: String }],
  
  // 行为统计
  documentActions: { type: Number, default: 0 },
  aiInteractions: { type: Number, default: 0 },
  collaborationActions: { type: Number, default: 0 },
  searchQueries: { type: Number, default: 0 },
  
  // 设备信息
  device: DeviceSchema,
  
  // 入口和出口页面
  entryPage: { type: String },
  exitPage: { type: String },
  
  // 标记
  isActive: { type: Boolean, default: true },
  isBounce: { type: Boolean, default: false } // 是否为跳出会话
}, {
  timestamps: true,
  collection: 'user_sessions'
});

UserSessionSchema.index({ sessionStart: -1 });
UserSessionSchema.index({ userId: 1, sessionStart: -1 });
UserSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30天后删除

// 每日统计聚合模式
const DailyStatsSchema = new Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  
  // 基础指标
  totalEvents: { type: Number, default: 0 },
  uniqueUsers: { type: Number, default: 0 },
  uniqueSessions: { type: Number, default: 0 },
  
  // 事件类型统计
  eventTypeStats: {
    page_view: { type: Number, default: 0 },
    user_action: { type: Number, default: 0 },
    document_action: { type: Number, default: 0 },
    ai_interaction: { type: Number, default: 0 },
    collaboration: { type: Number, default: 0 },
    search: { type: Number, default: 0 },
    error: { type: Number, default: 0 },
    performance: { type: Number, default: 0 }
  },
  
  // 页面统计
  topPages: [{
    path: String,
    views: Number,
    uniqueUsers: Number
  }],
  
  // 用户行为统计
  avgSessionDuration: { type: Number },
  bounceRate: { type: Number },
  
  // 设备统计
  deviceStats: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'daily_stats'
});

DailyStatsSchema.index({ date: -1 });

// 创建和导出模型
export const TrackingEventModel: Model<ITrackingEvent> = 
  mongoose.models.TrackingEvent || mongoose.model<ITrackingEvent>('TrackingEvent', TrackingEventSchema);

export const UserSessionModel = 
  mongoose.models.UserSession || mongoose.model('UserSession', UserSessionSchema);

export const DailyStatsModel = 
  mongoose.models.DailyStats || mongoose.model('DailyStats', DailyStatsSchema);

// 数据库操作类
export class TrackingDB {
  /**
   * 保存埋点事件
   */
  static async saveEvents(events: TrackingEvent[]): Promise<boolean> {
    try {
      await TrackingEventModel.insertMany(events);
      
      // 异步更新会话和统计数据
      this.updateSessionsAsync(events);
      this.updateDailyStatsAsync(events);
      
      return true;
    } catch (error) {
      console.error('保存埋点事件失败:', error);
      return false;
    }
  }

  /**
   * 异步更新用户会话
   */
  private static async updateSessionsAsync(events: TrackingEvent[]) {
    try {
      const sessionUpdates = new Map();
      
      for (const event of events) {
        if (!sessionUpdates.has(event.sessionId)) {
          sessionUpdates.set(event.sessionId, {
            sessionId: event.sessionId,
            userId: event.userId,
            organizationId: event.organizationId,
            device: event.device,
            events: []
          });
        }
        sessionUpdates.get(event.sessionId).events.push(event);
      }

      for (const [sessionId, sessionData] of sessionUpdates) {
        await this.updateUserSession(sessionData);
      }
    } catch (error) {
      console.error('更新用户会话失败:', error);
    }
  }

  /**
   * 更新单个用户会话
   */
  private static async updateUserSession(sessionData: any) {
    const { sessionId, userId, organizationId, device, events } = sessionData;
    
    const session = await UserSessionModel.findOne({ sessionId });
    
    if (!session) {
      // 创建新会话
      await UserSessionModel.create({
        sessionId,
        userId,
        organizationId,
        sessionStart: new Date(Math.min(...events.map((e: any) => e.timestamp))),
        device,
        entryPage: events.find((e: any) => e.eventName === 'page_enter')?.page?.path,
        uniquePages: [...new Set(events.map((e: any) => e.page?.path).filter(Boolean))]
      });
    } else {
      // 更新现有会话
      const updates: any = {
        sessionEnd: new Date(Math.max(...events.map((e: any) => e.timestamp))),
        $inc: {},
        $addToSet: { uniquePages: { $each: events.map((e: any) => e.page?.path).filter(Boolean) } }
      };

      // 统计各类事件
      events.forEach((event: any) => {
        switch (event.eventType) {
          case 'page_view':
            updates.$inc.pageViews = (updates.$inc.pageViews || 0) + 1;
            break;
          case 'document_action':
            updates.$inc.documentActions = (updates.$inc.documentActions || 0) + 1;
            break;
          case 'ai_interaction':
            updates.$inc.aiInteractions = (updates.$inc.aiInteractions || 0) + 1;
            break;
          case 'collaboration':
            updates.$inc.collaborationActions = (updates.$inc.collaborationActions || 0) + 1;
            break;
          case 'search':
            updates.$inc.searchQueries = (updates.$inc.searchQueries || 0) + 1;
            break;
        }
      });

      // 计算会话时长
      updates.duration = updates.sessionEnd.getTime() - session.sessionStart.getTime();
      
      await UserSessionModel.updateOne({ sessionId }, updates);
    }
  }

  /**
   * 异步更新每日统计
   */
  private static async updateDailyStatsAsync(events: TrackingEvent[]) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const dailyStats = await DailyStatsModel.findOne({ date: today });
      
      if (!dailyStats) {
        await DailyStatsModel.create({ date: today });
      }

      const updates: any = {
        $inc: {
          totalEvents: events.length,
          uniqueUsers: [...new Set(events.map(e => e.userId).filter(Boolean))].length,
          uniqueSessions: [...new Set(events.map(e => e.sessionId))].length
        }
      };

      // 统计事件类型
      events.forEach(event => {
        updates.$inc[`eventTypeStats.${event.eventType}`] = 
          (updates.$inc[`eventTypeStats.${event.eventType}`] || 0) + 1;
      });

      await DailyStatsModel.updateOne({ date: today }, updates);
    } catch (error) {
      console.error('更新每日统计失败:', error);
    }
  }

  /**
   * 获取用户行为分析
   */
  static async getUserBehaviorAnalysis(userId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await TrackingEventModel.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: startDate.getTime() }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          avgDuration: { $avg: '$business.duration' }
        }
      }
    ]);
  }

  /**
   * 获取页面热力图数据
   */
  static async getPageHeatmap(path: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await TrackingEventModel.aggregate([
      {
        $match: {
          'page.path': path,
          timestamp: { $gte: startDate.getTime() }
        }
      },
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ]);
  }
} 