import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { sheetToDbEntries } from '../sheetToJson.js';
import { I18nDB } from '../../types/i18n.js';

const originalDb: I18nDB = {
  source_lang: 'en-US',
  non_translatable: [],
  glossary: {},
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

function createTestSheet(filePath: string, rows: any[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'i18n');
  XLSX.writeFile(workbook, filePath);
}

describe('sheetToDbEntries', () => {
  const sheetPath = path.resolve('./test-sheet.xlsx');

  beforeEach(() => {
    // 表头 + 数据
    const rows = [
      ['key', 'en-US', 'zh-CN', 'glossary', 'last_update'],
      ['home.title', 'Home', '首页修改', ''], // 修改 zh-CN
      ['button.submit', 'Submit', '提交', ''], // 未修改
    ];
    createTestSheet(sheetPath, rows);
  });

  afterEach(() => {
    // 测试完成后删除临时文件
    fs.unlinkSync(sheetPath);
  });

  it('should update last_update only for changed entries', () => {
    const newEntries = sheetToDbEntries(sheetPath, originalDb);

    // home.title 应该更新 last_update
    expect(newEntries['home.title']['zh-CN']).toBe('首页修改');
    expect(newEntries['home.title'].last_update).not.toBe(originalDb.entries['home.title'].last_update);

    // button.submit 未修改 last_update 保持原值
    expect(newEntries['button.submit']['zh-CN']).toBe('提交');
    expect(newEntries['button.submit'].last_update).toBe(originalDb.entries['button.submit'].last_update);
  });
});
