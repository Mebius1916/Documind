"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Users, 
  Clock, 
  TrendingUp,
  Share2,
  Edit3,
  Eye,
  Download,
  PieChart,
  BarChart3,
  Calendar,
  MessageSquare
} from 'lucide-react';
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DocumentStats {
  totalDocuments: number;
  activeDocuments: number;
  sharedDocuments: number;
  collaborativeDocuments: number;
  totalViews: number;
  totalEdits: number;
  avgCollaborators: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const DocumentsPage: React.FC = () => {
  const [stats, setStats] = useState<DocumentStats>({
    totalDocuments: 0,
    activeDocuments: 0,
    sharedDocuments: 0,
    collaborativeDocuments: 0,
    totalViews: 0,
    totalEdits: 0,
    avgCollaborators: 0
  });

  const [loading, setLoading] = useState(true);
  const [documentTrendData, setDocumentTrendData] = useState<any[]>([]);
  const [templateData, setTemplateData] = useState<any[]>([]);
  const [collaborationData, setCollaborationData] = useState<any[]>([]);

  useEffect(() => {
    const loadDocumentStats = async () => {
      try {
        setLoading(true);
        console.log('开始获取文档统计数据...');
        
        const response = await fetch('/api/documents/analytics?days=30', {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('文档统计数据获取成功:', result);
        
        if (result.success) {
          // 更新基础统计
          setStats(result.data.documentStats);
          
          // 更新趋势数据
          setDocumentTrendData(result.data.documentTrendData);
          
          // 更新模板数据
          setTemplateData(result.data.templateData);
          
          // 更新协作数据
          setCollaborationData(result.data.collaborationData);
        } else {
          throw new Error(result.error || '获取文档统计失败');
        }
      } catch (error) {
        console.error('获取文档统计失败:', error);
        // 保持默认值，不抛出错误
      } finally {
        setLoading(false);
      }
    };

    loadDocumentStats();
  }, []);

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
      {/* 文档统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总文档数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12.5% 比上月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃文档</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              最近30天有编辑
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">共享文档</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sharedDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.sharedDocuments / stats.totalDocuments) * 100).toFixed(1)}% 共享率
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">协作文档</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collaborativeDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              多人实时编辑
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="templates">模板分析</TabsTrigger>
          <TabsTrigger value="collaboration">协作统计</TabsTrigger>
          <TabsTrigger value="performance">文档表现</TabsTrigger>
        </TabsList>

        {/* 总览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>文档创建趋势</CardTitle>
                <CardDescription>过去30天的文档创建情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={documentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="documents" 
                      stroke="#3B82F6" 
                      fill="#3B82F6"
                      fillOpacity={0.6}
                      name="文档创建数"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>文档活动趋势</CardTitle>
                <CardDescription>查看和编辑活动变化</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={documentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="查看次数"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="edits" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      name="编辑次数"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>热门文档排行</CardTitle>
              <CardDescription>最受欢迎的文档列表</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: '团队工作手册', views: 1234, edits: 67, collaborators: 8, type: '指南' },
                  { title: '项目技术文档', views: 987, edits: 45, collaborators: 5, type: '技术' },
                  { title: '月度总结报告', views: 856, edits: 23, collaborators: 3, type: '报告' },
                  { title: '产品需求文档', views: 743, edits: 34, collaborators: 6, type: '需求' },
                  { title: '会议纪要模板', views: 652, edits: 12, collaborators: 4, type: '模板' }
                ].map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <h4 className="font-medium">{doc.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {doc.views} 查看
                          </span>
                          <span className="flex items-center">
                            <Edit3 className="h-3 w-3 mr-1" />
                            {doc.edits} 编辑
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {doc.collaborators} 协作者
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge>{doc.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 模板分析标签页 */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>模板使用分布</CardTitle>
                <CardDescription>不同模板的使用情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={templateData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                    >
                      {templateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>模板使用排行</CardTitle>
                <CardDescription>各模板的具体使用数量</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={templateData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>模板详细统计</CardTitle>
              <CardDescription>各模板的使用数据和趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templateData.map((template, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        className="text-white"
                      >
                        {template.percentage}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{template.count}</div>
                    <p className="text-sm text-muted-foreground">使用次数</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      当前周期使用
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 协作统计标签页 */}
        <TabsContent value="collaboration" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均协作者</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgCollaborators}</div>
                <p className="text-xs text-muted-foreground">
                  每个文档平均协作人数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">实时协作会话</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">
                  当前活跃的协作会话
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">协作效率</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89%</div>
                <p className="text-xs text-muted-foreground">
                  协作文档完成率
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>协作活跃时间</CardTitle>
              <CardDescription>24小时协作活动分布</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={collaborationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="活跃用户"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="collaborations" 
                    stackId="2"
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="协作会话"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>协作团队排行</CardTitle>
              <CardDescription>最活跃的协作团队</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { team: '产品开发团队', documents: 45, members: 8, activity: '95%' },
                  { team: '设计团队', documents: 32, members: 6, activity: '89%' },
                  { team: '营销团队', documents: 28, members: 5, activity: '87%' },
                  { team: '工程团队', documents: 41, members: 12, activity: '82%' },
                  { team: '运营团队', documents: 23, members: 4, activity: '78%' }
                ].map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <h4 className="font-medium">{team.team}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{team.documents} 协作文档</span>
                          <span>{team.members} 成员</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {team.activity} 活跃度
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文档表现标签页 */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总查看次数</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +15.3% 比上月
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总编辑次数</CardTitle>
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEdits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +8.7% 比上月
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均编辑时长</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23分钟</div>
                <p className="text-xs text-muted-foreground">
                  每次编辑平均时长
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">文档完成率</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-muted-foreground">
                  创建后完善的文档比例
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>文档生命周期分析</CardTitle>
              <CardDescription>文档从创建到完成的时间分布</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { stage: '草稿', count: 145, avgTime: '2小时' },
                  { stage: '编辑中', count: 324, avgTime: '1天' },
                  { stage: '审阅中', count: 189, avgTime: '3天' },
                  { stage: '已完成', count: 589, avgTime: '5天' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex space-x-4">
        <Button 
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2"
        >
          <BarChart3 className="h-4 w-4" />
          <span>刷新数据</span>
        </Button>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出报告
        </Button>
      </div>
    </div>
  );
};

export default DocumentsPage; 