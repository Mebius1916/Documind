"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database,
  Gauge,
  Monitor,
  Server,
  Wifi,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface SystemStatus {
  database: 'online' | 'offline' | 'warning';
  api: 'online' | 'offline' | 'warning';
  tracking: 'online' | 'offline' | 'warning';
  liveblocks: 'online' | 'offline' | 'warning';
  convex: 'online' | 'offline' | 'warning';
}

interface PerformanceMetrics {
  responseTime: number;
  uptime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

const MonitoringPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'online',
    api: 'online', 
    tracking: 'online',
    liveblocks: 'online',
    convex: 'online'
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    uptime: 99.9,
    errorRate: 0.1,
    activeConnections: 0,
    memoryUsage: 45,
    cpuUsage: 23
  });

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // 加载真实监控数据
  useEffect(() => {
    const loadMonitoringData = async () => {
      try {
        setLoading(true);
        console.log('开始获取监控数据...');
        
        const response = await fetch('/api/monitoring', {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('监控数据获取成功:', result);
        
                 if (result.success) {
           // 更新系统状态
           setSystemStatus(result.data.systemStatus);
           
           // 更新性能指标
           setMetrics(result.data.performanceMetrics);
           
           // 更新性能趋势数据
           setPerformanceData(result.data.performanceData);
           
           // 更新最近事件
           setRecentEvents(result.data.recentEvents);
         } else {
           throw new Error(result.error || '获取监控数据失败');
         }
      } catch (error) {
        console.error('获取监控数据失败:', error);
        // 保持默认值，不抛出错误
      } finally {
        setLoading(false);
      }
    };

    loadMonitoringData();

    // 每30秒更新一次数据
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(systemStatus).map(([service, status]) => (
          <Card key={service}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {service === 'liveblocks' ? 'Liveblocks' : 
                 service === 'convex' ? 'Convex' :
                 service === 'api' ? 'API 服务' :
                 service === 'database' ? '数据库' : '埋点系统'}
              </CardTitle>
              {getStatusIcon(status)}
            </CardHeader>
            <CardContent>
              {getStatusBadge(status)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 关键性能指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">响应时间</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              平均 API 响应时间
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统正常运行时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              过去 30 天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误率</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              过去 24 小时
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃连接</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeConnections}</div>
            <p className="text-xs text-muted-foreground">
              WebSocket 连接数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 性能趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>响应时间趋势</CardTitle>
            <CardDescription>过去 24 小时的 API 响应时间</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="响应时间 (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活跃用户趋势</CardTitle>
            <CardDescription>过去 24 小时的活跃用户数</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="活跃用户"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 资源使用情况 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gauge className="h-5 w-5 mr-2" />
              系统资源使用
            </CardTitle>
            <CardDescription>服务器资源占用情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">内存使用</span>
                <span className="text-sm text-muted-foreground">{metrics.memoryUsage}%</span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">CPU 使用</span>
                <span className="text-sm text-muted-foreground">{metrics.cpuUsage}%</span>
              </div>
              <Progress value={metrics.cpuUsage} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">磁盘空间</span>
                <span className="text-sm text-muted-foreground">15%</span>
              </div>
              <Progress value={15} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              服务状态详情
            </CardTitle>
            <CardDescription>各服务模块详细状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Next.js 应用服务器', status: 'online', uptime: '99.9%' },
                { name: 'Convex 后端', status: 'online', uptime: '99.8%' },
                { name: 'MongoDB 数据库', status: 'online', uptime: '99.9%' },
                { name: 'Liveblocks 实时服务', status: 'online', uptime: '99.7%' },
                { name: 'Clerk 认证服务', status: 'online', uptime: '99.9%' },
                { name: 'DeepSeek AI 服务', status: 'warning', uptime: '98.5%' }
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(service.status)}
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{service.uptime}</span>
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近警报和事件 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            最近事件
          </CardTitle>
          <CardDescription>系统警报和重要事件记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvents.length > 0 ? recentEvents.map((event, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {event.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {event.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  {event.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {event.type === 'info' && <Activity className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{event.message}</span>
                    <span className="text-xs text-muted-foreground">{event.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">服务: {event.service}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无最近事件</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex space-x-4">
        <Button 
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2"
        >
          <Activity className="h-4 w-4" />
          <span>刷新监控数据</span>
        </Button>
        
        <Button variant="outline">
          <Database className="h-4 w-4 mr-2" />
          导出监控报告
        </Button>
      </div>
    </div>
  );
};

export default MonitoringPage; 