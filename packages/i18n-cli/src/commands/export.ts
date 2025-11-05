import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { exportDbToSheet } from '../utils/jsonToSheet.js';
import type { I18nDB } from '../types/i18n.js';
import { logger } from '../utils/logger.js';

export const exportCommand = new Command('export')
  .description('Export i18n db JSON to Excel/CSV for proofreading')
  .option('-c, --config <path>', 'Path to i18n db JSON file', 'i18n.db.json')
  .option('-o, --output <path>', 'Output Excel file path', '.i18n/i18n.xlsx')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      if (!fs.existsSync(configPath)) {
        logger.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }

      const db: I18nDB = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const outputFile = path.resolve(options.output);

      exportDbToSheet(db, outputFile);

      logger.success(`✅ Export completed: ${outputFile}`);
    } catch (err) {
      console.error('❌ Export failed:', (err as Error).message);
      process.exit(1);
    }
  });
