import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { sheetToDb } from '../utils/sheetToJson.js';
import type { I18nDB } from '../types/i18n.js';
import { logger } from '../utils/logger.js';

export const importCommand = new Command('import')
  .description('Import proofreading Excel/CSV sheet and update i18n db JSON')
  .requiredOption('-s, --sheet <path>', 'Path to the proofread Excel/CSV sheet')
  .option('-c, --config <path>', 'Path to i18n db JSON file', 'i18n.db.json')
  .option('-o, --output <path>', 'Output JSON file path (default: overwrite config)', '')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      const sheetPath = path.resolve(options.sheet);
      const outputFile = options.output ? path.resolve(options.output) : configPath; // 默认覆盖原文件

      if (!fs.existsSync(configPath)) {
        logger.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }

      if (!fs.existsSync(sheetPath)) {
        logger.error(`❌ Sheet file not found: ${sheetPath}`);
        process.exit(1);
      }

      const db: I18nDB = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      sheetToDb(sheetPath, db, outputFile);

      logger.success(`✅ Import completed. Updated db written to: ${outputFile}`);
    } catch (err) {
      console.error('❌ Import failed:', (err as Error).message);
      process.exit(1);
    }
  });
