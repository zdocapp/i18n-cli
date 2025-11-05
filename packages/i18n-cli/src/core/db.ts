import fs from 'fs';
import { I18nDB, I18nDBEntry, EntryValue, Locale } from '../types/i18n';
import { logger } from '../utils/logger.js';

/**
 * 将翻译完成的 tempData 合并到 DB
 * 如果翻译结果有变化，则更新 last_update
 */
export function mergeTempDataToDB(db: I18nDB, tempData: I18nDBEntry, targetLangs: Locale[]): I18nDB {
  const newDb = JSON.parse(JSON.stringify(db));
  const now = new Date().toISOString();

  const mergedEntries: I18nDBEntry = { ...db.entries };

  // 先做增量合并（和你原来逻辑等价，但对 newValue 的判定更严格）
  for (const key in tempData) {
    const newEntry: EntryValue = tempData[key];
    const oldEntry: EntryValue = db.entries[key] || {};

    const mergedEntry: EntryValue = { ...oldEntry };
    let changed = false;

    for (const lang of targetLangs) {
      const newValue = newEntry[lang];
      const oldValue = oldEntry[lang];

      // 注意：使用 typeof 检查，避免空字符串等被误判
      if (typeof newValue !== 'undefined' && newValue !== oldValue) {
        mergedEntry[lang] = newValue;
        changed = true;
      }
    }

    // 如果 tempData 提供了 source_lang，则以 tempData 为准覆盖主语言
    if (newEntry && typeof newEntry[db.source_lang] !== 'undefined') {
      mergedEntry[db.source_lang] = newEntry[db.source_lang];
    }

    if (changed || !oldEntry.last_update) {
      mergedEntry.last_update = now;
    }

    mergedEntries[key] = mergedEntry;
  }

  // —— 关键：基于主语言的“旧集合 vs 新集合”来做删除
  const oldSourceKeys = new Set(
    Object.keys(db.entries).filter(
      (k) =>
        db.entries[k] && typeof db.entries[k][db.source_lang] !== 'undefined' && db.entries[k][db.source_lang] !== '',
    ),
  );

  const newSourceKeys = new Set(
    Object.keys(tempData).filter(
      (k) => tempData[k] && typeof tempData[k][db.source_lang] !== 'undefined' && tempData[k][db.source_lang] !== '',
    ),
  );

  const removedKeys: string[] = [];
  for (const k of oldSourceKeys) {
    if (!newSourceKeys.has(k)) {
      delete mergedEntries[k];
      removedKeys.push(k);
    }
  }

  if (removedKeys.length > 0) {
    // 你项目里有 logger 的话可以换成 logger.warn(...)
    logger.warn(
      `[i18n] removed ${removedKeys.length} entries not present in source (${db.source_lang}): ${removedKeys.join(', ')}`,
    );
  }

  newDb.entries = mergedEntries;
  return newDb;
}

/**
 * 写回 i18n.db.json
 */
export async function saveDB(dbPath: string, db: I18nDB) {
  const output = JSON.stringify(db, null, 2);
  await fs.writeFileSync(dbPath, output, 'utf-8');
}
