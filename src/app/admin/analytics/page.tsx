"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  Search,
  Eye,
  MousePointer,
  Zap
} from 'lucide-react';

// 颜色主题
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981', 
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  orange: '#F97316'
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.purple,
  COLORS.pink,
  COLORS.teal,
  COLORS.orange,
  COLORS.danger
];

interface AnalyticsData {
  overview?: any;
  realtime?: any;
  performance?: any;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description 
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
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
};

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({});
  const [timeRange, setTimeRange] = useState('7');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取分析数据
  const fetchAnalyticsData = async (days: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewRes, realtimeRes, performanceRes] = await Promise.all([
        fetch(`/api/tracking/analytics?type=overview&days=${days}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store', // 确保获取最新数据
        }),
        fetch(`/api/tracking/analytics?type=realtime`, {
          method: 'GET', 
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }),
        fetch(`/api/tracking/analytics?type=performance&days=${days}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })
      ]);

      if (!overviewRes.ok || !realtimeRes.ok || !performanceRes.ok) {
        const errorDetails = await Promise.all([
          overviewRes.ok ? null : overviewRes.text(),
          realtimeRes.ok ? null : realtimeRes.text(),
          performanceRes.ok ? null : performanceRes.text(),
        ]);
        throw new Error(`API请求失败: ${errorDetails.filter(Boolean).join(', ')}`);
      }

      const [overview, realtime, performance] = await Promise.all([
        overviewRes.json(),
        realtimeRes.json(), 
        performanceRes.json()
      ]);

      console.log('API返回数据:', { overview, realtime, performance }); // 调试日志

      setData({
        overview: overview.data,
        realtime: realtime.data,
        performance: performance.data
      });
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : '获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData(timeRange);
    
    // 设置定时刷新实时数据
    const interval = setInterval(() => {
      fetchAnalyticsData(timeRange);
    }, 30000); // 30秒刷新

    return () => clearInterval(interval);
  }, [timeRange]);

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 格式化变化文本
  const formatChangeText = (changeValue: string, timeRange: string) => {
    if (!changeValue || changeValue === '无数据') return '无数据';
    
    const timeRangeText = {
      '1': '比昨天',
      '7': '比上周',
      '30': '比上月',
      '90': '比上季度'
    }[timeRange] || '比前期';
    
    return `${changeValue} ${timeRangeText}`;
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500 mr-2" />
              <span className="text-lg">{error}</span>
            </div>
            <Button 
              onClick={() => fetchAnalyticsData(timeRange)}
              className="mt-4 mx-auto block"
            >
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和控制器 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">数据分析仪表板</h1>
          <p className="text-muted-foreground">Documind 埋点数据实时分析</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">最近1天</SelectItem>
              <SelectItem value="7">最近7天</SelectItem>
              <SelectItem value="30">最近30天</SelectItem>
              <SelectItem value="90">最近90天</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => fetchAnalyticsData(timeRange)}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新数据'}
          </Button>
        </div>
      </div>

      {/* 实时状态指示器 */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-muted-foreground">
          实时数据 · 在线用户: {data.realtime?.onlineUsers || 0}
        </span>
        <Badge variant="outline" className="ml-2">
          {timeRange}天数据
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="users">用户行为</TabsTrigger>
          <TabsTrigger value="documents">文档分析</TabsTrigger>
          <TabsTrigger value="ai">AI交互</TabsTrigger>
          <TabsTrigger value="performance">性能监控</TabsTrigger>
        </TabsList>

        {/* 总览页面 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="总事件数"
              value={formatNumber(data.overview?.basicStats?.totalEvents || 0)}
              change={formatChangeText(data.overview?.basicStats?.changes?.totalEvents?.value || '无数据', timeRange)}
              changeType={data.overview?.basicStats?.changes?.totalEvents?.type || 'neutral'}
              icon={<Activity />}
              description="用户行为事件总数"
            />
            <MetricCard
              title="活跃用户"
              value={formatNumber(data.overview?.basicStats?.uniqueUsers || 0)}
              change={formatChangeText(data.overview?.basicStats?.changes?.uniqueUsers?.value || '无数据', timeRange)}
              changeType={data.overview?.basicStats?.changes?.uniqueUsers?.type || 'neutral'}
              icon={<Users />}
              description="独立用户访问数"
            />
            <MetricCard
              title="用户会话"
              value={formatNumber(data.overview?.basicStats?.uniqueSessions || 0)}
              change={formatChangeText(data.overview?.basicStats?.changes?.uniqueSessions?.value || '无数据', timeRange)}
              changeType={data.overview?.basicStats?.changes?.uniqueSessions?.type || 'neutral'}
              icon={<Eye />}
              description="用户会话总数"
            />
            <MetricCard
              title="平均会话事件"
              value={(data.overview?.basicStats?.avgEventsPerSession || 0).toFixed(1)}
              change={formatChangeText(data.overview?.basicStats?.changes?.avgEventsPerSession?.value || '无数据', timeRange)}
              changeType={data.overview?.basicStats?.changes?.avgEventsPerSession?.type || 'neutral'}
              icon={<MousePointer />}
              description="每个会话的平均事件数"
            />
          </div>

          {/* 事件类型分布 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>事件类型分布</CardTitle>
                <CardDescription>各类用户行为事件的占比</CardDescription>
              </CardHeader>
              <CardContent>
                {data.overview?.eventTypeDistribution && data.overview.eventTypeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.overview.eventTypeDistribution.map((item: any) => ({
                          name: item._id || '未知',
                          count: item.count || 0
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {data.overview.eventTypeDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-gray-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>热门页面</CardTitle>
                <CardDescription>用户访问最多的页面</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data.overview?.topPages || []).slice(0, 8).map((page: any, index: number) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{page.path}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{page.views}</div>
                        <div className="text-sm text-muted-foreground">
                          {page.uniqueUsers} 用户
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 趋势图表 */}
          <Card>
            <CardHeader>
              <CardTitle>活动趋势</CardTitle>
              <CardDescription>每日用户活动和事件趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.overview?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="events" 
                    stackId="1"
                    stroke={COLORS.primary} 
                    fill={COLORS.primary}
                    fillOpacity={0.6}
                    name="事件数"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stackId="2"
                    stroke={COLORS.secondary} 
                    fill={COLORS.secondary}
                    fillOpacity={0.6}
                    name="用户数"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户行为分析 */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>用户活跃时间分布</CardTitle>
                <CardDescription>24小时用户活动热力图</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.overview?.userActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>会话时长分布</CardTitle>
                <CardDescription>用户会话持续时间统计</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { range: '0-1分钟', count: 45 },
                    { range: '1-5分钟', count: 120 },
                    { range: '5-15分钟', count: 89 },
                    { range: '15-30分钟', count: 67 },
                    { range: '30分钟+', count: 34 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>用户行为路径</CardTitle>
              <CardDescription>用户在应用中的导航路径</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { path: '首页 → 创建文档 → 编辑器', count: 234, percentage: 35 },
                  { path: '首页 → AI助手 → 文档搜索', count: 189, percentage: 28 },
                  { path: '首页 → 文档列表 → 编辑器', count: 156, percentage: 23 },
                  { path: '编辑器 → AI助手 → 编辑器', count: 98, percentage: 14 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge>{index + 1}</Badge>
                      <span className="font-medium">{item.path}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold">{item.count}</div>
                        <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文档分析 */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="文档创建"
              value="1,234"
              change="+15.3% 比昨天"
              changeType="positive"
              icon={<FileText />}
            />
            <MetricCard
              title="协作会话"
              value="567"
              change="+8.7% 比昨天"
              changeType="positive"
              icon={<Users />}
            />
            <MetricCard
              title="平均编辑时长"
              value="23分钟"
              change="+12% 比昨天"
              changeType="positive"
              icon={<Clock />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>文档操作统计</CardTitle>
                <CardDescription>各类文档操作的频次</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { action: '创建', count: 234 },
                    { action: '编辑', count: 567 },
                    { action: '保存', count: 789 },
                    { action: '分享', count: 123 },
                    { action: '删除', count: 45 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="action" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.accent} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>模板使用情况</CardTitle>
                <CardDescription>不同模板的使用频率</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: '空白文档', value: 345 },
                        { name: '会议记录', value: 234 },
                        { name: '项目计划', value: 178 },
                        { name: '技术文档', value: 156 },
                        { name: '其他', value: 87 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[].map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>文档协作活动</CardTitle>
              <CardDescription>实时协作功能使用情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: '同时在线编辑', value: '平均 2.3 人', color: 'bg-blue-500' },
                  { label: '评论互动', value: '每日 234 条', color: 'bg-green-500' },
                  { label: '@提及次数', value: '每日 89 次', color: 'bg-purple-500' }
                ].map((metric, index) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`w-12 h-12 ${metric.color} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="font-semibold">{metric.value}</div>
                    <div className="text-sm text-muted-foreground">{metric.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI交互分析 */}
        <TabsContent value="ai" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="AI对话次数"
              value="2,456"
              change="+23.1% 比昨天"
              changeType="positive"
              icon={<MessageSquare />}
            />
            <MetricCard
              title="平均响应时间"
              value="1.2s"
              change="-5.3% 比昨天"
              changeType="positive"
              icon={<Zap />}
            />
            <MetricCard
              title="用户满意度"
              value="4.7/5"
              change="+0.2 比昨天"
              changeType="positive"
              icon={<TrendingUp />}
            />
            <MetricCard
              title="问题解决率"
              value="89.3%"
              change="+3.4% 比昨天"
              changeType="positive"
              icon={<Search />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI对话趋势</CardTitle>
                <CardDescription>每日AI交互次数变化</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.overview?.aiInteractions || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="conversations" stroke={COLORS.primary} name="对话数" />
                    <Line type="monotone" dataKey="messages" stroke={COLORS.secondary} name="消息数" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>热门AI问题类型</CardTitle>
                <CardDescription>用户最常询问的问题分类</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { category: '文档编辑帮助', count: 456, percentage: 34 },
                    { category: '功能使用指导', count: 378, percentage: 28 },
                    { category: '协作问题', count: 234, percentage: 18 },
                    { category: '技术支持', count: 189, percentage: 14 },
                    { category: '其他', count: 78, percentage: 6 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-medium">{item.category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${item.percentage * 2}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI响应质量分析</CardTitle>
              <CardDescription>AI回复的准确性和用户满意度</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: '平均响应长度', value: '156 字符', trend: '+12%' },
                  { label: '包含代码示例', value: '23.4%', trend: '+5%' },
                  { label: '用户点赞率', value: '91.2%', trend: '+8%' },
                  { label: '后续追问率', value: '34.5%', trend: '-3%' }
                ].map((metric, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metric.value}</div>
                    <div className="text-sm text-muted-foreground">{metric.label}</div>
                    <div className="text-xs text-green-600 mt-1">{metric.trend}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能监控 */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="平均加载时间"
              value={`${data.performance?.avgLoadTime || 0}s`}
              change={formatChangeText(data.performance?.changes?.avgLoadTime?.value || '无数据', timeRange)}
              changeType={data.performance?.changes?.avgLoadTime?.type || 'neutral'}
              icon={<Zap />}
            />
            <MetricCard
              title="首次内容绘制"
              value={`${data.performance?.avgFCP || 0}s`}
              change={formatChangeText(data.performance?.changes?.avgFCP?.value || '无数据', timeRange)}
              changeType={data.performance?.changes?.avgFCP?.type || 'neutral'}
              icon={<Activity />}
            />
            <MetricCard
              title="错误率"
              value={`${data.performance?.errorRate || 0}%`}
              change={formatChangeText(data.performance?.changes?.errorRate?.value || '无数据', timeRange)}
              changeType={data.performance?.changes?.errorRate?.type || 'neutral'}
              icon={<AlertCircle />}
            />
            <MetricCard
              title="跳出率"
              value={`${data.performance?.bounceRate || 0}%`}
              change={formatChangeText(data.performance?.changes?.bounceRate?.value || '无数据', timeRange)}
              changeType={data.performance?.changes?.bounceRate?.type || 'neutral'}
              icon={<TrendingUp />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>页面加载时间分布</CardTitle>
                <CardDescription>不同加载时间区间的页面占比</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.performance?.loadTimeDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.accent} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>性能指标趋势</CardTitle>
                <CardDescription>关键性能指标的时间趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.performance?.performanceStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="loadTime" stroke={COLORS.primary} name="加载时间(ms)" />
                    <Line type="monotone" dataKey="fcp" stroke={COLORS.secondary} name="FCP(ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>实时性能监控</CardTitle>
              <CardDescription>当前系统运行状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" transform="translate(36, 36)" />
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="62.83" strokeDashoffset="15.7" className="text-green-500" transform="translate(36, 36)" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">95%</span>
                    </div>
                  </div>
                  <div className="font-semibold">系统可用性</div>
                  <div className="text-sm text-muted-foreground">过去24小时</div>
                </div>

                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" transform="translate(36, 36)" />
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="62.83" strokeDashoffset="25.13" className="text-blue-500" transform="translate(36, 36)" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">2.1s</span>
                    </div>
                  </div>
                  <div className="font-semibold">平均响应时间</div>
                  <div className="text-sm text-muted-foreground">API 响应</div>
                </div>

                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" transform="translate(36, 36)" />
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="62.83" strokeDashoffset="56.5" className="text-yellow-500" transform="translate(36, 36)" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">12</span>
                    </div>
                  </div>
                  <div className="font-semibold">活跃连接</div>
                  <div className="text-sm text-muted-foreground">WebSocket 连接</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage; 