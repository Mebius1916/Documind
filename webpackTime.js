/**
 * Webpack 构建时间测量插件
 * @class
 * @classdesc 用于测量 Webpack 完整构建时间的插件
 */
class MeasureBuildTimePlugin {
  /**
   * 初始化构建开始时间
   * @constructor
   */
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Webpack 插件应用方法
   * @param {Object} compiler - Webpack 编译器实例
   */
  apply(compiler) {
    try {
      compiler.hooks.done.tap("MeasureBuildTimePlugin", () => {
        const endTime = Date.now();
        const totalBuildTime = endTime - this.startTime;
        
        // 使用模板字符串保持输出格式统一
        console.log('\n----------------------------');
        console.log(`🚀 构建时间: ${totalBuildTime} 毫秒`);
        console.log('----------------------------\n');
      });
    } catch (error) {
      console.error('构建时间测量插件出错:', error);
    }
  }
}

module.exports = MeasureBuildTimePlugin;