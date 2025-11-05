import { describe, it, expect } from 'vitest';
import { buildPromptFromTemplate } from '../prompt.js';
import { defaultConfig } from '../config.js';

const prompt_template = defaultConfig.prompt_template;

describe('buildPromptFromTemplate', () => {
  it('should replace language placeholder', () => {
    const result = buildPromptFromTemplate({ template: prompt_template, locale: 'zh-CN' });
    expect(result).toContain('将以下 JSON 对象中的界面文案翻译成简体中文');
  });

  it('should include glossary when provided', () => {
    const glossary = [{ Crypto: '加密货币' }];
    const result = buildPromptFromTemplate({
      template: prompt_template,
      locale: 'zh-CN',
      glossary: { 'zh-CN': glossary },
    });
    expect(result).toContain('- 参考词汇表（glossary）进行翻译，保持术语一致');
    expect(result).toContain(JSON.stringify(glossary));
  });

  it('should not include glossary section when empty', () => {
    const result = buildPromptFromTemplate({ template: prompt_template, locale: 'zh-CN', glossary: { 'zh-CN': [] } });
    expect(result).not.toContain('参考词汇表');
    expect(result).not.toContain('# 词汇表');
  });

  it('should include nonTranslatable when provided', () => {
    const nonTranslatable = ['API_KEY', 'URL'];
    const result = buildPromptFromTemplate({ template: prompt_template, locale: 'zh-CN', nonTranslatable });
    expect(result).toContain('- 不翻译 non_translatable 列表中的内容，保持原样');
    expect(result).toContain(JSON.stringify(nonTranslatable));
  });

  it('should not include nonTranslatable section when empty', () => {
    const result = buildPromptFromTemplate({ template: prompt_template, locale: 'zh-CN', nonTranslatable: [] });
    expect(result).not.toContain('不翻译 non_translatable');
    expect(result).not.toContain('# 不可翻译内容列表');
  });

  it('should replace all placeholders correctly together', () => {
    const glossary = [{ Crypto: '加密货币' }];
    const nonTranslatable = ['API_KEY'];
    const result = buildPromptFromTemplate({
      template: prompt_template,
      locale: 'zh-CN',
      glossary: { 'zh-CN': glossary },
      nonTranslatable,
    });

    expect(result).toContain('将以下 JSON 对象中的界面文案翻译成简体中文');
    expect(result).toContain(JSON.stringify(glossary));
    expect(result).toContain(JSON.stringify(nonTranslatable));
  });
});
