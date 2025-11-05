import { describe, expect, it } from 'vitest';
import { mergeTempDataToDB } from '../db.js';

const db = {
  source_lang: 'en-US',
  non_translatable: [],
  glossary: [],

  entries: {
    'title.buy': {
      'en-US': 'Buy',
      last_update: '2025-09-18T06:42:44.478Z',
    },
  },
} as any;

const tempData = {
  'title.buy': {
    'en-US': 'Buy',
    last_update: '2025-09-18T06:42:44.478Z',
    'zh-CN': '购买',
  },
};

describe('db', () => {
  it('可以合并', () => {
    const newDb = mergeTempDataToDB(db, tempData, ['zh-CN']);
    expect(newDb.entries).toBeDefined();
  });
});
