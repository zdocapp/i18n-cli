import { describe, expect, it } from 'vitest';
import { flattenAndPrepare } from '../flatten.js';
import { I18nDB, I18nDBEntry } from '../../types/i18n.js';

describe('flattenAndPrepare', () => {
  it('simple test', () => {
    const sourceData = {
      account: {
        optional: 'Optional',
      },
      newIndustryList: [
        {
          label: 'Cryptocurrency Mining',
          value: '200',
          options: [{ label: 'ASIC Miners', value: '2000001' }],
        },
      ],
    };

    const dbEntries: I18nDB['entries'] = {
      'account.optional': {
        'zh-TW': '選填',
        'en-US': 'Optional',
        last_update: '2025-09-24T04:15:01.653Z',
      },

      newIndustryList: {
        'zh-TW': [
          {
            label: '加密貨幣挖礦',
            value: '200',
            options: [
              {
                label: 'ASIC 礦機',
                value: '2000001',
              },
            ],
          },
        ],
        'en-US': [
          {
            label: 'Cryptocurrency Mining',
            value: '200',
            options: [
              {
                label: 'ASIC Miners',
                value: '2000001',
              },
            ],
          },
        ],
        last_update: '2025-09-24T04:15:01.653Z',
      },
    };

    const tempData: I18nDBEntry = flattenAndPrepare(sourceData, {
      source_lang: 'en-US',
      cache: dbEntries,
    });

    expect(tempData).toMatchObject({
      'account.optional': {
        'zh-TW': '選填',
        'en-US': 'Optional',
        last_update: '2025-09-24T04:15:01.653Z',
      },
      newIndustryList: {
        'zh-TW': expect.any(Array),
        'en-US': expect.any(Array),
        last_update: expect.any(String),
      },
    });

    console.log(JSON.stringify(tempData, null, 2));
  });
});
