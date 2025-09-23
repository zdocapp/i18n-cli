import fs from 'fs/promises';
import path from 'path';
import { I18nConfig } from '../types/i18n.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from './config.js';

export async function checkTranslations(configPath: string) {
  const config = loadConfig(configPath);

  const mainFilePath = path.resolve(process.cwd(), config.source_file);
  const mainRaw = await fs.readFile(mainFilePath, 'utf-8');
  const mainData = JSON.parse(mainRaw);

  const missing: { key: string; lang: string; note?: string }[] = [];

  for (const lang of config.target_langs) {
    const langFilePath = mainFilePath.replace(config.source_lang, lang);
    let langData: any = {};
    try {
      const raw = await fs.readFile(langFilePath, 'utf-8');
      langData = JSON.parse(raw);
    } catch {
      logger.warn(`⚠️ Translation file not found: ${langFilePath}`);
    }

    function checkRecursive(src: any, target: any, prefix = '') {
      if (typeof target !== typeof src || target === null) {
        missing.push({ key: prefix || '(root)', lang });
        return;
      }
      if (typeof src === 'object' && src !== null) {
        const srcKeys = Object.keys(src);
        const targetKeys = Object.keys(target);
        if (srcKeys.length !== targetKeys.length) {
          missing.push({
            key: prefix || '(root)',
            lang,
            note: `expected ${srcKeys.length} keys, got ${targetKeys.length}`,
          });
        }
        for (const key of srcKeys) {
          const currentKey = prefix ? `${prefix}.${key}` : key;
          if (!(key in target)) {
            missing.push({ key: currentKey, lang });
            continue;
          }
          const val = target[key];
          if (typeof val === 'string' && val.trim() === '') {
            missing.push({ key: currentKey, lang, note: 'empty translation' });
          }
          checkRecursive(src[key], target[key], currentKey);
        }
      }
    }

    checkRecursive(mainData, langData);
  }

  if (missing.length === 0) {
    logger.success('✅ All translations exist!');
  } else {
    logger.error('⚠️ Missing or inconsistent translations:');
    missing.forEach((item) => {
      const note = item.note ? ` (${item.note})` : '';
      logger.error(`- ${item.key} missing in ${item.lang}${note}`);
    });
    process.exitCode = 1;
  }
}
