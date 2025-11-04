import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '../core/config.js';
import { logger } from '../utils/logger.js';
import { flattenAndPrepare } from '../core/flatten.js';
import { mergeTempDataToDB, saveDB } from '../core/db.js';
import { exportI18n } from '../core/exporter.js';
import { translateTempData } from '../core/translate.js';
import { I18nDB, I18nDBEntry, Locale } from '../types/i18n.js';
import { I18nConfig } from '../types/i18n.js';
import { checkTranslations } from '../core/checkTranslations.js';
import { generateEditorJS } from '../core/generateEditorJS.js';

interface RunContext {
  lang: Locale;
  tempData: I18nDBEntry;
  dbPath: string;
  db: I18nDB;
  config: I18nConfig;
}

/**
 * 处理单个目标语言：
 * 翻译 -> 合并 -> 写 DB -> 导出
 */
async function processLanguage(ctx: RunContext): Promise<I18nDB> {
  const { lang, tempData, dbPath, db, config } = ctx;
  logger.info(`开始处理语言：${lang}`);

  try {
    // 克隆数据，避免修改原对象
    const cloneTempData = JSON.parse(JSON.stringify(tempData));

    // 翻译
    const translatedData = await translateTempData(cloneTempData, lang, config);
    logger.info(`翻译完成 -> ${lang}`);

    // 合并
    const merged = mergeTempDataToDB(db, translatedData, [lang]);
    logger.info(`合并数据完成 -> ${lang}`);

    // 写入 DB
    await saveDB(dbPath, merged);
    logger.info(`写入 DB 完成 -> ${lang}`);

    // 导出单个语言包
    exportI18n(merged, config, [lang]);
    logger.info(`导出语言包完成 -> ${lang}`);

    // 生成 editor.js
    if (config.editor_js_file) {
      generateEditorJS(merged, config);
      logger.info(`生成 editor.js 完成`);
    }

    return merged;
  } catch (err) {
    logger.error(`处理语言失败 -> ${lang}: ${(err as Error).message}`);
    return db; // 保持原有 DB，不中断整个流程
  }
}

/**
 * 读取或初始化 DB
 */
function loadOrInitDB(config: any, dbPath: string): I18nDB {
  const dbFile = path.resolve(dbPath);
  if (fs.existsSync(dbFile)) {
    const db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
    logger.info(`Loaded cache from ${dbFile}`);
    return db;
  }

  const newDb: I18nDB = {
    source_lang: config.source_lang,
    non_translatable: config.non_translatable || [],
    glossary: config.glossary || [],
    entries: {},
  };

  fs.writeFileSync(dbFile, JSON.stringify(newDb, null, 2), 'utf-8');
  logger.info(`Initialized new cache`);
  return newDb;
}

/**
 * 读取源语言文件
 */
function loadSourceFile(config: any): any {
  const sourceFile = path.resolve(`${config.source_file}`);
  if (!fs.existsSync(sourceFile)) {
    logger.error(`Source language file not found: ${sourceFile}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
}

/**
 * 主流程
 */
async function runPipeline(configPath: string) {
  logger.info('Starting i18n run process...');

  // 1. 读取配置
  const config = loadConfig(configPath);
  const dbPath = config.db_file || 'i18n.db.json';
  logger.info(`Loaded config from ${configPath}`);

  // 2. 读取源语言文件
  const sourceContent = loadSourceFile(config);

  // 3. 加载或初始化 DB
  let db = loadOrInitDB(config, dbPath);

  // 4. 展开主语言包
  const tempData = flattenAndPrepare(sourceContent, {
    source_lang: config.source_lang,
    cache: db?.entries,
  });
  logger.info(`Total entries ${Object.keys(tempData).length}`);

  // 5. 逐个处理目标语言
  for (const lang of config.target_langs) {
    db = await processLanguage({ lang, tempData, dbPath, db, config });
  }

  logger.success('i18n run process completed ✅');
}

/**
 * CLI command
 */
export const runCommand = new Command('run')
  .description('Run automatic translation and generate target language files')
  .action(async () => {
    try {
      // const configPath = path.resolve('i18n.config.json');
      // await runPipeline(configPath);

      const configPath = path.resolve('i18n.config.json');

      // 执行自动翻译流程
      await runPipeline(configPath);
      logger.success('✅ Translation pipeline completed.');

      // 自动执行 check
      logger.info('🔍 Running translation check...');
      // 调用 checkCommand 的 action
      await checkTranslations(configPath);
    } catch (err) {
      logger.error('Run failed: ' + (err as Error).message);
      process.exit(1);
    }
  });
