import mongoose from "mongoose";

let isConnected: boolean = false;

/**
 * 连接 MongoDB 数据库
 * 用于存储埋点数据和分析
 */
export const connectDB = async () => {
  mongoose.set('strictQuery', true); // 开启严格模式
  
  if (isConnected) {
    console.log("📊 MongoDB 已连接");
    return;
  }

  try {
    await mongoose.connect(
      process.env.MONGODB_URL as string,
      {
        dbName: "DocumentTracking", // 埋点数据库名
      }
    );
    
    isConnected = true;
    console.log("📊 MongoDB 连接成功");
  } catch (error) {
    console.error("❌ MongoDB 连接失败:", error);
    throw error;
  }
};

/**
 * 断开 MongoDB 连接
 */
export const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("📊 MongoDB 连接已断开");
  } catch (error) {
    console.error("❌ MongoDB 断开连接失败:", error);
    throw error;
  }
};

/**
 * 获取连接状态
 */
export const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    states: {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    }
  };
}; 