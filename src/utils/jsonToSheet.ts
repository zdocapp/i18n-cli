// import * as fs from 'fs';
// import * as path from 'path';
import * as XLSX from 'xlsx';
import { I18nDB, Locale } from '../types/i18n.js'; // 假设你的类型定义在 types.ts

/**
 * 将 I18nDB 转换为 sheet 表格数据
 */
export function dbToSheetData(db: I18nDB): any[][] {
  const { source_lang, entries, glossary } = db;

  // 收集所有语言列
  const allLangs = new Set<Locale>();
  for (const key in entries) {
    const entry = entries[key];
    Object.keys(entry).forEach((lang) => {
      if (lang !== 'last_update') {
        allLangs.add(lang as Locale);
      }
    });
  }

  // 确保源语言在第一列
  const langList = [source_lang, ...Array.from(allLangs).filter((l) => l !== source_lang)];

  // 表头
  const header = ['key', ...langList, 'glossary', 'last_update'];

  // 数据行
  const rows: any[][] = [];
  for (const key in entries) {
    const entry = entries[key];
    const row: any[] = [key];

    // 各语言文本
    for (const lang of langList) {
      row.push(entry[lang as Locale] ?? '');

      if (lang !== source_lang) {
        // glossary（匹配 key）
        const sourceLangText = entry[source_lang];
        if (typeof sourceLangText === 'string') {
          const glossaryItem = glossary[lang]?.find((g) => Object.keys(g).some((k) => k === sourceLangText));
          row.push(glossaryItem ? glossaryItem[sourceLangText] : '');
        }
      }
    }

    // 更新时间
    row.push(entry.last_update ?? '');

    rows.push(row);
  }

  return [header, ...rows];
}

/**
 * 导出 I18nDB 为 Excel/CSV 文件
 */
export function exportDbToSheet(db: I18nDB, outputFile: string) {
  const sheetData = dbToSheetData(db);

  // 转换为 sheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // 创建 workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'i18n');

  // 写入文件
  XLSX.writeFile(workbook, outputFile);
}
