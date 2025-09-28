// import * as fs from 'fs';
// import * as path from 'path';
import * as XLSX from 'xlsx';
import { I18nDB, Locale } from '../types/i18n.js'; // 假设你的类型定义在 types.ts

/**
 * 将 I18nDB 转换为 sheet 表格数据
 */
export function dbToSheetData(db: I18nDB): any[][] {
  const { source_lang, entries, glossary } = db;

  // 收集所有语言列（排除 last_update）
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
  const header: string[] = ['key', source_lang];
  for (const lang of langList) {
    if (lang !== source_lang) {
      header.push(lang, `${lang}_glossary`);
    }
  }
  header.push('last_update');

  // 数据行
  const rows: any[][] = [];
  for (const key in entries) {
    const entry = entries[key];
    const row: any[] = [key];

    // 源语言
    const sourceLangText = entry[source_lang];
    row.push(typeof sourceLangText === 'string' ? sourceLangText : JSON.stringify(sourceLangText));

    // 目标语言 + glossary
    for (const lang of langList) {
      if (lang === source_lang) continue;

      const entryValue = entry[lang];
      row.push(typeof entryValue === 'string' ? entryValue : entryValue ? JSON.stringify(entryValue) : '');

      if (typeof sourceLangText === 'string') {
        const glossaryItem = glossary[lang]?.find((g) => Object.prototype.hasOwnProperty.call(g, sourceLangText));
        row.push(glossaryItem ? glossaryItem[sourceLangText] : '');
      } else {
        row.push('');
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
