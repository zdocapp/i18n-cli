import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { I18nDB, I18nDBEntry, Locale } from '../types/i18n.js';
import isEqual from 'lodash/isEqual.js';

/**
 * 将 sheet 文件转换为 I18nDB.entries，并只在内容变更时更新 last_update
 * 且严格保留原始 db.entries 的顺序和每个 entry 内部字段顺序
 */
export function sheetToDbEntries(sheetFile: string, originalDb: I18nDB): I18nDBEntry {
  const workbook = XLSX.readFile(sheetFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) throw new Error('Sheet is empty or missing header');

  const header = rows[0] as string[];
  const keyIndex = header.indexOf('key');
  if (keyIndex === -1) throw new Error("Sheet missing 'key' column");

  // 表格中语言列索引
  const langIndices: Partial<Record<Locale, number>> = {};
  header.forEach((col, i) => {
    if (col !== 'key' && col !== 'last_update' && col !== 'glossary') {
      langIndices[col as Locale] = i;
    }
  });

  // 将表格行映射成 key -> row
  const rowMap: Record<string, any[]> = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const key = row[keyIndex];
    if (key) rowMap[key] = row;
  }

  const newEntries: I18nDBEntry = {};

  // 遍历原始 entries，保留顺序
  for (const key of Object.keys(originalDb.entries)) {
    const originalEntry = originalDb.entries[key];
    const row = rowMap[key];

    const entry: any = {};
    let hasChange = false;

    // 遍历原始 entry 字段顺序，保留内部 key 顺序
    const originalFields = Object.keys(originalEntry).filter((f) => f !== 'last_update');

    for (const field of originalFields) {
      const oldValue = originalEntry[field as Locale];
      const colIdx = langIndices[field as Locale];
      let newValue = colIdx !== undefined && row ? (row[colIdx] ?? oldValue) : oldValue;
      if (typeof oldValue !== 'string') {
        newValue = JSON.parse(newValue);
      }

      entry[field] = newValue;
      //   if (newValue !== oldValue) hasChange = true;
      if (!isEqual(newValue, oldValue)) hasChange = true;
    }

    // last_update 放最后
    entry.last_update = hasChange ? new Date().toISOString() : (originalEntry.last_update ?? '');

    newEntries[key] = entry;
  }

  return newEntries;
}

/**
 * 从 sheet 文件更新完整 I18nDB
 * @param sheetFile 校对完成的 Excel/CSV 文件
 * @param originalDb 原始 I18nDB
 * @param outputFile 可选输出文件路径，如果指定则写入文件
 */
export function sheetToDb(sheetFile: string, originalDb: I18nDB, outputFile?: string): I18nDB {
  const newEntries = sheetToDbEntries(sheetFile, originalDb);

  const newDb: I18nDB = {
    ...originalDb,
    entries: newEntries,
  };

  if (outputFile) {
    fs.writeFileSync(path.resolve(outputFile), JSON.stringify(newDb, null, 2), 'utf-8');
    console.log(`✅ Updated db written to: ${outputFile}`);
  }

  return newDb;
}

// CLI 调试示例
// if (require.main === module) {
//   const dbPath = path.resolve('db.json');
//   const sheetPath = path.resolve('i18n.xlsx');
//   const outPath = path.resolve('db.updated.json');

//   const db: I18nDB = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
//   sheetToDb(sheetPath, db, outPath);
// }
