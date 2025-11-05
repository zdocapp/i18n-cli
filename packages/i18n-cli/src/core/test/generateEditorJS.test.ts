import { describe, it, expect } from 'vitest';
import { generateReverseMap } from '../generateEditorJS.js';
import { I18nDB } from '../../types/i18n.js';

describe.only('generateReverseMap', () => {
  it('simple test', () => {
    const i18nDB: I18nDB = {
      source_lang: 'en-US',
      non_translatable: [],
      glossary: {},
      entries: {
        'pages.edit.youPay': {
          'zh-TW': '您支付',
          'en-US': 'You pay',
          last_update: '2025-11-04T13:04:42.586Z',
          'zh-CN': '您支付',
        },
        'pages.edit.youGet': {
          'zh-TW': '您獲得',
          'en-US': 'You get',
          last_update: '2025-11-04T13:04:42.586Z',
          'zh-CN': '您获得',
        },
        'pages.edit.continue': {
          'zh-TW': '繼續',
          'en-US': 'Continue',
          last_update: '2025-11-04T13:04:42.586Z',
          'zh-CN': '继续',
        },
      },
    };

    const ret = generateReverseMap(i18nDB.entries, ['zh-CN', 'zh-TW']);
    console.log('ret:', ret);
  });
});
