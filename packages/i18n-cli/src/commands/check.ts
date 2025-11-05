import { Command } from 'commander'; // 引入 Commander 库，用于构建 CLI 命令
import { checkTranslations } from '../core/checkTranslations.js';

// 创建一个新的 CLI 命令 check
export const checkCommand = new Command('check')
  .description('Check that all translations exist for the main language entries') // 命令描述
  .option('-c, --config <path>', 'Path to i18n config file', 'i18n.config.json') // 配置文件路径选项
  .action(async (options) => {
    await checkTranslations(options.config);
  });
