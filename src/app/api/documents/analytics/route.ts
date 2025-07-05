import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TrackingEventModel } from '@/models/tracking';

/**
 * 获取文档统计分析数据
 * GET /api/documents/analytics
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = startDate.getTime();

    // 获取文档基础统计
    const documentStats = await getDocumentStats(startTimestamp);
    
    // 获取文档趋势数据
    const documentTrendData = await getDocumentTrend(startTimestamp);
    
    // 获取模板使用数据
    const templateData = await getTemplateUsage(startTimestamp);
    
    // 获取协作数据
    const collaborationData = await getCollaborationStats(startTimestamp);
    
    // 获取热门文档
    const popularDocuments = await getPopularDocuments(startTimestamp);

    return NextResponse.json({
      success: true,
      data: {
        documentStats,
        documentTrendData,
        templateData,
        collaborationData,
        popularDocuments
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('文档分析API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取文档基础统计
 */
async function getDocumentStats(since: number) {
  try {
    // 文档操作统计
    const documentActions = await TrackingEventModel.aggregate([
      {
        $match: {
          eventType: 'document_action',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 },
          uniqueDocuments: { $addToSet: '$document.id' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ]);

    // 文档查看统计
    const documentViews = await TrackingEventModel.aggregate([
      {
        $match: {
          eventName: 'document_open',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          uniqueDocuments: { $addToSet: '$document.id' }
        }
      }
    ]);

    // 协作文档统计
    const collaborativeDocuments = await TrackingEventModel.aggregate([
      {
        $match: {
          eventType: 'collaboration',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$document.id',
          collaborators: { $addToSet: '$userId' }
        }
      },
      {
        $match: {
          'collaborators.1': { $exists: true } // 至少2个协作者
        }
      },
      {
        $count: 'collaborativeDocuments'
      }
    ]);

    // 共享文档统计
    const sharedDocuments = await TrackingEventModel.countDocuments({
      eventName: 'document_share',
      timestamp: { $gte: since }
    });

    // 编辑统计
    const editStats = await TrackingEventModel.aggregate([
      {
        $match: {
          eventName: 'document_edit',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          totalEdits: { $sum: 1 },
          uniqueDocuments: { $addToSet: '$document.id' }
        }
      }
    ]);

    // 计算平均协作者数量
    const avgCollaborators = await TrackingEventModel.aggregate([
      {
        $match: {
          eventType: 'collaboration',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$document.id',
          collaborators: { $addToSet: '$userId' }
        }
      },
      {
        $group: {
          _id: null,
          avgCollaborators: { $avg: { $size: '$collaborators' } }
        }
      }
    ]);

    const viewData = documentViews[0] || { totalViews: 0, uniqueDocuments: [] };
    const editData = editStats[0] || { totalEdits: 0, uniqueDocuments: [] };
    const collabData = collaborativeDocuments[0] || { collaborativeDocuments: 0 };

    return {
      totalDocuments: viewData.uniqueDocuments.length,
      activeDocuments: editData.uniqueDocuments.length,
      sharedDocuments: sharedDocuments,
      collaborativeDocuments: collabData.collaborativeDocuments,
      totalViews: viewData.totalViews,
      totalEdits: editData.totalEdits,
      avgCollaborators: Math.round((avgCollaborators[0]?.avgCollaborators || 0) * 10) / 10
    };
  } catch (error) {
    console.error('获取文档统计失败:', error);
    return {
      totalDocuments: 0,
      activeDocuments: 0,
      sharedDocuments: 0,
      collaborativeDocuments: 0,
      totalViews: 0,
      totalEdits: 0,
      avgCollaborators: 0
    };
  }
}

/**
 * 获取文档趋势数据
 */
async function getDocumentTrend(since: number) {
  try {
    const trendData = await TrackingEventModel.aggregate([
      {
        $match: {
          $or: [
            { eventName: 'document_create' },
            { eventName: 'document_open' },
            { eventName: 'document_edit' }
          ],
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%m-%d',
                date: { $toDate: '$timestamp' }
              }
            },
            action: '$eventName'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          documents: {
            $sum: {
              $cond: [{ $eq: ['$_id.action', 'document_create'] }, '$count', 0]
            }
          },
          views: {
            $sum: {
              $cond: [{ $eq: ['$_id.action', 'document_open'] }, '$count', 0]
            }
          },
          edits: {
            $sum: {
              $cond: [{ $eq: ['$_id.action', 'document_edit'] }, '$count', 0]
            }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          documents: 1,
          views: 1,
          edits: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    return trendData;
  } catch (error) {
    console.error('获取文档趋势失败:', error);
    return [];
  }
}

/**
 * 获取模板使用数据
 */
async function getTemplateUsage(since: number) {
  try {
    const templateUsage = await TrackingEventModel.aggregate([
      {
        $match: {
          eventName: 'document_create',
          'document.template': { $exists: true },
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$document.template',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 计算百分比
    const total = templateUsage.reduce((sum, item) => sum + item.count, 0);
    
    return templateUsage.map(item => ({
      name: item._id || '空白文档',
      count: item.count,
      percentage: Math.round((item.count / total) * 100 * 10) / 10
    }));
  } catch (error) {
    console.error('获取模板使用失败:', error);
    // 返回默认数据以防数据库中没有足够数据
    return [
      { name: '空白文档', count: 0, percentage: 100 }
    ];
  }
}

/**
 * 获取协作统计数据
 */
async function getCollaborationStats(since: number) {
  try {
    const collaborationActivity = await TrackingEventModel.aggregate([
      {
        $match: {
          eventType: 'collaboration',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            hour: {
              $hour: { $toDate: '$timestamp' }
            }
          },
          activeUsers: { $addToSet: '$userId' },
          collaborations: { $sum: 1 }
        }
      },
      {
        $project: {
          hour: { $concat: [{ $toString: '$_id.hour' }, ':00'] },
          activeUsers: { $size: '$activeUsers' },
          collaborations: 1
        }
      },
      {
        $sort: { '_id.hour': 1 }
      }
    ]);

    // 填充24小时数据
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      activeUsers: 0,
      collaborations: 0
    }));

    collaborationActivity.forEach(item => {
      const hourIndex = parseInt(item.hour.split(':')[0]);
      if (hourIndex >= 0 && hourIndex < 24) {
        hourlyData[hourIndex] = {
          hour: item.hour,
          activeUsers: item.activeUsers,
          collaborations: item.collaborations
        };
      }
    });

    return hourlyData;
  } catch (error) {
    console.error('获取协作统计失败:', error);
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      activeUsers: 0,
      collaborations: 0
    }));
  }
}

/**
 * 获取热门文档
 */
async function getPopularDocuments(since: number) {
  try {
    const popularDocs = await TrackingEventModel.aggregate([
      {
        $match: {
          $or: [
            { eventName: 'document_open' },
            { eventName: 'document_edit' }
          ],
          'document.id': { $exists: true },
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$document.id',
          title: { $first: '$document.title' },
          views: {
            $sum: {
              $cond: [{ $eq: ['$eventName', 'document_open'] }, 1, 0]
            }
          },
          edits: {
            $sum: {
              $cond: [{ $eq: ['$eventName', 'document_edit'] }, 1, 0]
            }
          },
          collaborators: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          title: { $ifNull: ['$title', '未命名文档'] },
          views: 1,
          edits: 1,
          collaborators: { $size: '$collaborators' },
          type: '文档'
        }
      },
      {
        $sort: { views: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return popularDocs;
  } catch (error) {
    console.error('获取热门文档失败:', error);
    return [];
  }
} 