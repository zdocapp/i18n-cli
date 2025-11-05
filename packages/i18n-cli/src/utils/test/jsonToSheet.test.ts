import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { dbToSheetData, exportDbToSheet } from '../jsonToSheet.js';
import { I18nDB } from '../../types/i18n.js';

const sampleDb: I18nDB = {
  source_lang: 'en-US',
  non_translatable: [],
  glossary: { 'zh-CN': [{ Home: '首页' }] },
  entries: {
    'home.title': {
      'en-US': 'Home',
      'zh-CN': '首页',
      last_update: '2025-09-25T10:00',
    },
    'button.submit': {
      'en-US': 'Submit',
      'zh-CN': '提交',
      last_update: '2025-09-24T15:00',
    },
  },
};

describe('json-to-sheet', () => {
  it('dbToSheetData should generate correct sheet array', () => {
    const sheetData = dbToSheetData(sampleDb);

    // 第一行是表头
    expect(sheetData[0]).toEqual(['key', 'en-US', 'zh-CN', 'glossary', 'last_update']);

    // 检查第一条数据
    expect(sheetData[1]).toEqual(['home.title', 'Home', '首页', '首页', '2025-09-25T10:00']);

    // 检查第二条数据
    expect(sheetData[2]).toEqual(['button.submit', 'Submit', '提交', '', '2025-09-24T15:00']);
  });

  it('exportDbToSheet should write xlsx file', () => {
    const outPath = path.resolve('./test-output.xlsx');

    // 清理旧文件
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    exportDbToSheet(sampleDb, outPath);

    expect(fs.existsSync(outPath)).toBe(true);

    // 读取文件验证内容
    const workbook = XLSX.readFile(outPath);
    const sheet = workbook.Sheets['i18n'];
    const sheetValues = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    expect(sheetValues[0]).toEqual(['key', 'en-US', 'zh-CN', 'glossary', 'last_update']);
    expect(sheetValues[1][0]).toBe('home.title');

    // 测试完成后删除临时文件
    fs.unlinkSync(outPath);
  });
});
