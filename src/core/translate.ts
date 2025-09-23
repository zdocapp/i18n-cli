import { logger } from '../utils/logger.js';
import OpenAI from 'openai';
import { I18nConfig } from '../types/i18n.js';
import { chunkByTokens } from './chunk.js';
import { I18nDBEntry, Locale, MessageValue, MessageRecord } from '../types/i18n.js';
import { compressKeys, restoreKeys } from '../utils/compressKeys.js';
import { buildPromptFromTemplate } from './prompt.js';

/**
 * 调用大模型翻译语言包
 */
async function translateI18nEntries(
  entries: MessageRecord,
  targetLang: Locale,
  config: I18nConfig,
): Promise<MessageRecord> {
  const { service, glossary, non_translatable = [] } = config;

  const prompt = buildPromptFromTemplate({
    template: config.prompt_template,
    locale: targetLang,
    glossary,
    nonTranslatable: non_translatable,
  });
  logger.info('Prompt:');
  logger.info(prompt);

  const { base_url, api_key, model, temperature, max_tokens } = service;

  const openai = new OpenAI({ baseURL: base_url, apiKey: api_key });
  const response = await openai.chat.completions.create({
    model,
    temperature,
    max_tokens,
    response_format: {
      type: 'json_object',
    },
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(entries) },
    ],
  });

  let result: MessageRecord = {};
  try {
    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('Translate failed');
    }

    result = JSON.parse(content);
  } catch (error) {
    logger.error(JSON.stringify(response));
    logger.error(`llm response error`);
  }

  return result;
}

/**
 * 翻译临时数据文件
 * @param tempData flattenAndPrepare 的输出
 */
export async function translateTempData(
  tempData: I18nDBEntry,
  targetLang: Locale,
  config: I18nConfig,
): Promise<I18nDBEntry> {
  // const { sourceLang, targetLang, serviceOptions } = config;
  const { source_lang: sourceLang, service: serviceOptions } = config;

  const { compress_keys } = serviceOptions;

  logger.info(`translate ${sourceLang} => ${targetLang}`);

  // 1. 提取待翻译内容（目标语言为空的）
  const messages: Record<string, MessageValue> = {};
  for (const key in tempData) {
    const entry = tempData[key];
    if (!entry[targetLang] && entry[sourceLang]) {
      messages[key] = entry[sourceLang];
    }
  }

  if (Object.keys(messages).length === 0) {
    return tempData; // 无需翻译
  }

  // 2. 根据配置决定是否压缩 key
  let batches: Record<string, MessageValue>[];
  let keyMap: Record<string, string> = {};
  if (compress_keys) {
    const { compressedMessages, keyMap: km } = compressKeys(messages);
    keyMap = km;
    batches = chunkByTokens(compressedMessages);
  } else {
    batches = chunkByTokens(messages);
  }

  // 3. 执行翻译
  for (let i = 0, len = batches.length; i < len; i++) {
    const batch = batches[i];
    logger.info(`开始翻译 ${i + 1}/${len}`);
    logger.info(JSON.stringify(batch));

    const translated = await translateI18nEntries(batch, targetLang, config);

    // 如果启用了压缩，还原 key
    const restored = compress_keys ? restoreKeys(translated, keyMap) : translated;

    logger.info(JSON.stringify(restored));
    logger.info(`翻译完成 ${i + 1}/${len}`);

    for (const key in restored) {
      tempData[key][targetLang] = restored[key];
    }
  }

  return tempData;
}
