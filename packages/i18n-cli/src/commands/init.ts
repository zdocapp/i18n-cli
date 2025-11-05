import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { defaultConfig } from '../core/config.js';
import { logger } from '../utils/logger.js';

export const initCommand = new Command('init')
  .description('Initialize i18n config and base language files')
  .option('-f, --force', 'Overwrite existing config and language files', false)
  .action(async (opts) => {
    try {
      const configPath = path.resolve('i18n.config.json');

      if (fs.existsSync(configPath) && !opts.force) {
        logger.warn('Config file already exists. Use --force to overwrite.');
        return;
      }

      // 1. 写入默认配置文件
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      logger.success(`Created config: ${configPath}`);

      logger.info('i18n initialization completed ✅');
    } catch (err) {
      logger.error('Init failed: ' + (err as Error).message);
      process.exit(1);
    }
  });
