import { describe, it, expect } from 'vitest';
import { translateTempData } from '../translate.js';
import { I18nConfig, I18nDBEntry, Locale } from '../../types/i18n.js';

const config: I18nConfig = {
  source_file: 'public/en.json',
  source_lang: 'en-US',
  target_langs: ['zh-TW'],
  db_file: 'i18n.db.json',
  service: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    base_url: 'https://api.deepseek.com',
    api_key: '{{OPENAI_API_KEY}}',
    temperature: 0.3,
    max_tokens: 4000,
    compress_keys: false,
  },
  glossary: {},
  non_translatable: [],
  output: {
    format: 'nested',
    indent: 2,
  },
  prompt_template:
    '你是一名专业的前端本地化(i18n)翻译专家，专门处理 Web 界面文案翻译。\n\n# 翻译任务\n将以下 JSON 对象中的界面文案翻译成{{language}}，用于网页显示\n\n# 必须遵守的规则\n- 保持所有 key 完全不变\n- 准确翻译 value 部分为目标语言：{{language}}\n- 保留所有动态占位符及其原始格式，如：{xxx}\n- 空字符串、纯数字、URL、HTML 标签、CSS 类名等非文本内容保持原样\n- 针对按钮文本、菜单项、标签、提示语等界面元素，使用简洁明了的表达\n- 确保翻译后的文本长度适合界面布局，避免过长影响显示\n{{glossary}}\n{{nonTranslatable}}\n\n# 输出要求\n- 只输出完整且合法的 JSON 对象\n- 不要包含任何额外文本、注释或说明\n- 保持与输入完全相同的 JSON 结构和格式\n\n# 网页文案翻译指南\n- 按钮文本：使用动词或动作短语，保持简短\n- 菜单项：使用名词或动宾短语\n- 标签和标题：保持清晰准确\n- 提示信息：符合当地语言习惯\n- 错误信息：提供明确的操作指引\n\n# 输入示例\n{\n  "button.submit": "Submit",\n  "menu.dashboard": "Dashboard",\n  "title.welcome": "Welcome, {username}!",\n  "error.required": "This field is required",\n  "tooltip.search": "Search for products"\n}\n\n# 输出示例（目标语言：简体中文）\n{\n  "button.submit": "提交",\n  "menu.dashboard": "控制面板",\n  "title.welcome": "欢迎，{username}！",\n  "error.required": "此字段为必填项",\n  "tooltip.search": "搜索商品"\n}\n\n现在请翻译以下 JSON 内容：\n',
};

describe('translateTempData', () => {
  it('simple test', async () => {
    const tempData: I18nDBEntry = {
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

    const ret = await translateTempData(tempData, 'zh-TW', config);

    expect(ret).toMatchObject({
      'account.optional': {
        'zh-TW': '選填',
        'en-US': 'Optional',
        last_update: '2025-09-24T04:15:01.653Z',
      },
      newIndustryList: {
        'zh-TW': expect.any(Array),
        'en-US': expect.any(Array),
        last_update: '2025-09-24T04:15:01.653Z',
      },
    });
  });
});
