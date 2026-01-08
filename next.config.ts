import type { NextConfig } from "next"; 
// 引入自定义的 Webpack 插件，用于测量构建时间
const MeasureBuildTimePlugin = require("./webpackTime");
// 引入 Terser 插件，用于压缩 JavaScript 代码
const TerserPlugin = require("terser-webpack-plugin");
// 引入 code-inspector-plugin 插件，用于代码检查
const { codeInspectorPlugin } = require('code-inspector-plugin');
// 引入 Next.js 的打包分析插件，只有在环境变量 ANALYZE 为 true 时启用
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// 定义 Next.js 配置
const nextConfig: NextConfig = {
  reactStrictMode: true, // 启用 React 的严格模式，帮助发现潜在问题
  images: {
    remotePatterns: [ // 配置允许加载的远程图像
      {
        protocol: 'https', // 允许的协议
        hostname: 'img.clerk.com', // 允许的主机名
        port: '', // 允许的端口，留空表示不限制
        pathname: '/**', // 允许的路径模式
      },
    ],
    loader: "default", // 使用默认的图像加载器
    formats: ["image/avif", "image/webp"], // 支持的图像格式，提高加载性能
  },

  typescript: {
    ignoreBuildErrors: true, // 允许在构建时忽略 TypeScript 错误，方便快速开发
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => { // 自定义 Webpack 配置
    config.plugins.push(new MeasureBuildTimePlugin()); // 添加自定义构建时间测量插件
    if (process.env.NODE_ENV === 'development') {
      config.plugins.push(codeInspectorPlugin({
        bundler: 'webpack',
      })); // 添加代码检查插件（仅开发环境）
    }

    // 配置代码分割策略
    config.optimization.splitChunks = {
      chunks: "all", // 对所有类型的代码进行分割
      minSize: 30000, // 最小分割尺寸为 30KB
      maxSize: 250000, // 最大分割尺寸为 250KB
      minChunks: 1, // 最少被引用次数为 1
      maxAsyncRequests: 30, // 最大异步请求数为 30
      maxInitialRequests: 30, // 最大初始请求数为 30
      automaticNameDelimiter: "~", // 自动命名分割块时的分隔符
      cacheGroups: { // 定义缓存组
        tiptap: {
          test: /[\\/]node_modules[\\/]@tiptap[\\/]/, // 匹配 @tiptap 库
          name: "tiptap", // 分割块的名称
          priority: 20, // 优先级
          reuseExistingChunk: true, // 允许重用已存在的块
        },
        liveblocks: {
          test: /[\\/]node_modules[\\/](@liveblocks|y-protocols)[\\/]/, // 匹配 @liveblocks 和 y-protocols 库
          name: "liveblocks", // 分割块的名称
          priority: 20, // 优先级
        },
        convex: {
          test: /[\\/]node_modules[\\/](convex|zustand)[\\/]/, // 匹配 convex 和 zustand 库
          name: "convex", // 分割块的名称
          priority: 20, // 优先级
        },
        clerk: {
          test: /[\\/]node_modules[\\/]@clerk[\\/]/, // 匹配 @clerk 库
          name: "clerk", // 分割块的名称
          priority: 20, // 优先级
        },
        components: {
          test: /[\\/]src[\\/]components[\\/]ui[\\/]/, // 匹配 UI 组件
          name: "components", // 分割块的名称
          priority: -5, // 优先级高于默认组
          reuseExistingChunk: true, // 允许重用已存在的块
          minSize: 0, // 允许小体积组件合并
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/, // 匹配所有第三方库
          priority: -10, // 优先级最低
        },
        default: {
          minChunks: 2, // 最少被引用次数为 2
          priority: -20, // 优先级最低
          reuseExistingChunk: true, // 允许重用已存在的块
        },
      },
    };

    // 如果存在优化配置，添加 TerserPlugin 进行代码压缩
    if (config.optimization) {
      config.optimization.minimizer.push(
        new TerserPlugin({
          parallel: true, // 启用并行压缩
          terserOptions: {
            compress: {
              drop_console: process.env.NODE_ENV === "production", // 在生产环境中去除控制台日志
              passes: 2, // 增加压缩次数
            },
            output: {
              comments: false, // 不保留注释
            },
          },
          extractComments: false, // 不提取注释
        })
      );
    }

    // 配置 babel-loader 的缓存目录
    const babelLoader = config.module.rules.find(rule => 
      rule.loader && rule.loader.includes('babel-loader')
    );

    if (babelLoader) {
      babelLoader.options = {
        ...babelLoader.options,
        cacheDirectory: true, // 启用 babel-loader 的缓存
      };
    }

    // 启用 Webpack 5 的持久化缓存
    config.cache = {
      type: 'filesystem', // 使用文件系统缓存
      buildDependencies: {
        config: [__filename], // 依赖于当前配置文件
      },
    };

    return config; // 返回修改后的 Webpack 配置
  },
};

module.exports = withBundleAnalyzer(nextConfig);