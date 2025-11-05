import fs from 'fs';
import path from 'path';
import { I18nConfig } from '../types/i18n.js';
import { unflatten } from './flatten.js';
import { I18nDB, Locale, MessageValue } from '../types/i18n.js';

/**
 * 导出语言包
 */
export function exportI18n(
  db: I18nDB,
  config: I18nConfig,
  langs?: Locale[], // 新增可选参数
): void {
  const sourceFile = config.source_file;
  const outputDir = path.dirname(sourceFile);
  const outputFormat = config.output?.format ?? 'nested';
  const indent = config.output?.indent ?? 2;

  // 如果没有传 langs，则默认导出所有目标语言
  const targetLangs = langs?.length ? langs : config.target_langs;

  for (const lang of targetLangs) {
    const langData: Record<string, MessageValue> = {};

    // 遍历 DB entries，提取该语言的翻译
    for (const key in db.entries) {
      const entry = db.entries[key];
      langData[key] = entry[lang] || '';
    }

    // 根据 format 选择 flat/nested
    let exportData: Record<string, any>;
    if (outputFormat === 'flat') {
      exportData = langData;
    } else {
      exportData = unflatten(langData);
    }

    // 输出文件路径：替换 source_file 中的语言部分
    const outputFile = path.join(outputDir, `${lang}.json`);

    // 写入 JSON 文件
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, indent), 'utf-8');

    console.log(`[i18n] Exported ${lang} → ${outputFile}`);
  }
}
