import { languages } from '../constants/languages.js';
import { I18nConfig, Locale } from '../types/i18n.js';
import { logger } from '../utils/logger.js';

interface PromptData {
  template: string;
  locale: Locale;
  glossary?: I18nConfig['glossary'];
  nonTranslatable?: I18nConfig['non_translatable'];
}

/**
 * 使用静态模板生成最终 prompt
 */
export const buildPromptFromTemplate = (data: PromptData): string => {
  const { template, locale, glossary, nonTranslatable = [] } = data;
  const glossaryLocale = glossary?.[locale] ?? [];
  logger.info(`glossaryLocale: ${JSON.stringify(glossaryLocale)}`);
  logger.info(`locale: ${locale}`);
  logger.info(`glossary: ${JSON.stringify(glossary)}`);

  const language = languages[locale];
  if (!language) throw new Error(`targetLang invalid: ${locale}`);

  let prompt = template;

  // 替换语言占位符
  prompt = prompt.replace(/{{language}}/g, language);

  // 替换 glossary 占位符
  const glossaryText =
    glossaryLocale && glossaryLocale.length > 0
      ? `- 参考词汇表（glossary）进行翻译，保持术语一致\n  - 词汇表 (glossary)：${JSON.stringify(glossaryLocale)}`
      : '';
  prompt = prompt.replace(/{{glossary}}/g, glossaryText);

  // 替换 nonTranslatable 占位符
  const nonTranslatableText =
    nonTranslatable && nonTranslatable.length > 0
      ? `- 不翻译 non_translatable 列表中的内容，保持原样\n  - 不可翻译内容列表 (non_translatable)：${JSON.stringify(nonTranslatable)}`
      : '';
  prompt = prompt.replace(/{{nonTranslatable}}/g, nonTranslatableText);

  return prompt;
};
