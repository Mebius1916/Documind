"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Activity,
  TrendingUp,
  Clock,
  BarChart3,
  Eye,
  MousePointer,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface StatsData {
  totalUsers: number;
  totalDocuments: number;
  totalEvents: number;
  onlineUsers: number;
  todayViews: number;
  avgSessionTime: string;
  aiConversations: number;
  systemUptime: number;
}

interface SystemStatus {
  database: 'online' | 'offline' | 'warning';
  api: 'online' | 'offline' | 'warning';
  tracking: 'online' | 'offline' | 'warning';
  liveblocks: 'online' | 'offline' | 'warning';
  convex: 'online' | 'offline' | 'warning';
}

interface RecentActivity {
  time: string;
  event: string;
  details: string;
  type: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  href?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description,
  href 
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const cardContent = (
    <Card className={`${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs ${getChangeColor()}`}>
            {change}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
};

const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalDocuments: 0,
    totalEvents: 0,
    onlineUsers: 0,
    todayViews: 0,
    avgSessionTime: '0:00',
    aiConversations: 0,
    systemUptime: 0
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'warning',
    api: 'warning',
    tracking: 'warning',
    liveblocks: 'warning',
    convex: 'warning'
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载真实数据
    const loadStats = async () => {
      try {
        const [overviewRes, realtimeRes, documentsRes, monitoringRes] = await Promise.all([
          fetch('/api/tracking/analytics?type=overview&days=1', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }),
          fetch('/api/tracking/analytics?type=realtime', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }),
          fetch('/api/documents/analytics?days=1', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }),
          fetch('/api/monitoring', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          })
        ]);

        console.log('首页API响应状态:', { 
          overview: overviewRes.ok, 
          realtime: realtimeRes.ok, 
          documents: documentsRes.ok, 
          monitoring: monitoringRes.ok 
        });

        const [overview, realtime, documents, monitoring] = await Promise.all([
          overviewRes.ok ? overviewRes.json() : { data: {} },
          realtimeRes.ok ? realtimeRes.json() : { data: {} },
          documentsRes.ok ? documentsRes.json() : { data: { documentStats: { totalDocuments: 0 } } },
          monitoringRes.ok ? monitoringRes.json() : { data: { systemStatus: {}, performanceMetrics: {}, recentEvents: [] } }
        ]);

        console.log('首页API数据:', { overview, realtime, documents, monitoring });

        const overviewData = overview.data || {};
        const realtimeData = realtime.data || {};
        const documentsData = documents.data || {};
        const monitoringData = monitoring.data || {};

        // 计算AI对话数
        const aiConversations = overviewData.eventTypeDistribution?.find(
          (event: any) => event._id === 'ai_interaction'
        )?.count || 0;

        setStats({
          totalUsers: overviewData.basicStats?.uniqueUsers || 0,
          totalDocuments: documentsData.documentStats?.totalDocuments || 0,
          totalEvents: overviewData.basicStats?.totalEvents || 0,
          onlineUsers: realtimeData.onlineUsers || 0,
          todayViews: overviewData.topPages?.reduce((sum: number, page: any) => sum + page.views, 0) || 0,
          avgSessionTime: formatSessionTime(overviewData.basicStats?.avgEventsPerSession || 0),
          aiConversations: aiConversations,
          systemUptime: monitoringData.performanceMetrics?.uptime || 0
        });

        // 更新系统状态
        if (monitoringData.systemStatus) {
          setSystemStatus(monitoringData.systemStatus);
        }

        // 更新最近活动
        if (monitoringData.recentEvents) {
          const activities = monitoringData.recentEvents.map((event: any) => ({
            time: event.time,
            event: getEventTitle(event.type),
            details: event.message,
            type: event.type
          }));
          setRecentActivities(activities);
        }

      } catch (error) {
        console.error('获取总览数据失败:', error);
        // 保持默认值
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // 每30秒刷新一次数据
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // 格式化会话时间（基于平均事件数估算）
  const formatSessionTime = (avgEvents: number) => {
    // 假设每个事件平均间隔30秒
    const minutes = Math.floor((avgEvents * 30) / 60);
    const seconds = Math.floor((avgEvents * 30) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800">正常</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>;
      case 'offline':
        return <Badge className="bg-red-100 text-red-800">离线</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>;
    }
  };

  const getEventTitle = (eventType: string) => {
    switch (eventType) {
      case 'info':
        return '系统信息';
      case 'success':
        return '操作成功';
      case 'warning':
        return '系统警告';
      case 'error':
        return '错误事件';
      default:
        return '系统事件';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <MessageSquare className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <Users className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">欢迎使用 Documind 数据分析</h1>
            <p className="text-blue-100">
              实时监控用户行为、文档使用情况和系统性能
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">实时数据</span>
          </div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="总用户数"
          value={formatNumber(stats.totalUsers)}
          icon={<Users />}
          description="注册用户总数"
          href="/admin/analytics"
        />
        <MetricCard
          title="文档数量"
          value={formatNumber(stats.totalDocuments)}
          icon={<FileText />}
          description="创建的文档总数"
          href="/admin/documents"
        />
        <MetricCard
          title="今日访问"
          value={formatNumber(stats.todayViews)}
          icon={<Eye />}
          description="今日页面访问次数"
        />
        <MetricCard
          title="在线用户"
          value={stats.onlineUsers}
          icon={<Activity />}
          description="当前在线用户数"
        />
      </div>

      {/* 第二行指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="总事件数"
          value={formatNumber(stats.totalEvents)}
          icon={<MousePointer />}
          description="用户行为事件总数"
          href="/admin/analytics"
        />
        <MetricCard
          title="平均会话时长"
          value={stats.avgSessionTime}
          icon={<Clock />}
          description="用户平均停留时间"
        />
        <MetricCard
          title="AI 对话"
          value={formatNumber(stats.aiConversations)}
          icon={<MessageSquare />}
          description="今日 AI 对话次数"
        />
        <MetricCard
          title="系统可用性"
          value={`${stats.systemUptime.toFixed(1)}%`}
          icon={<Zap />}
          description="系统运行稳定性"
          href="/admin/monitoring"
        />
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              快速分析
            </CardTitle>
            <CardDescription>
              访问常用的数据分析功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                用户行为分析
              </Button>
            </Link>
            <Link href="/admin/documents">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                文档使用统计
              </Button>
            </Link>
            <Link href="/admin/monitoring">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                系统性能监控
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              系统状态
            </CardTitle>
            <CardDescription>
              当前系统运行状态概览
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">数据库连接</span>
                {getStatusBadge(systemStatus.database)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API 服务</span>
                {getStatusBadge(systemStatus.api)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">埋点收集</span>
                {getStatusBadge(systemStatus.tracking)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">实时协作</span>
                {getStatusBadge(systemStatus.liveblocks)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">后端服务</span>
                {getStatusBadge(systemStatus.convex)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 近期活动 */}
      <Card>
        <CardHeader>
          <CardTitle>近期活动</CardTitle>
          <CardDescription>系统最近的重要活动和更新</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {getEventIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{activity.event}</span>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无最近活动</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverviewPage; 