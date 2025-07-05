"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  FileText, 
  Activity,
  Home,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  // 等待用户数据加载
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 检查用户是否已登录
  if (!user) {
    redirect('/');
  }

  const navigation = [
    {
      name: '概览',
      href: '/admin',
      icon: Home,
      description: '数据总览'
    },
    {
      name: '用户行为分析',
      href: '/admin/analytics',
      icon: BarChart3,
      description: '埋点数据分析'
    },
    {
      name: '文档统计',
      href: '/admin/documents',
      icon: FileText,
      description: '文档使用统计'
    },
    {
      name: '系统状态',
      href: '/admin/monitoring',
      icon: Activity,
      description: '系统运行状态'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
        {/* 品牌标题 */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Documind</h1>
              <p className="text-xs text-gray-500">数据分析</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Analytics
          </Badge>
        </div>

        {/* 用户信息 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Image
              src={user?.imageUrl || '/logo.png'}
              alt={user?.fullName || ''}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon 
                  className={`
                    mr-3 h-5 w-5 
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                <div className="flex-1">
                  <div>{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>版本 v1.0.0</div>
            <div>最后更新: {new Date().toLocaleDateString()}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => window.location.href = '/'}
          >
            返回文档
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="pl-64">
        {/* 顶部状态栏 */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {navigation.find(item => 
                  pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                )?.name || '数据分析'}
              </h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                系统正常运行
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                当前时间: {new Date().toLocaleString()}
              </div>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 