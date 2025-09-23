import { languages } from '../constants/languages';

export type Locale = keyof typeof languages;

/** 文案的值 */
export type MessageValue = string | any[]; // 支持数组，某些场景下语言包可能使用复杂数据接口
/** 文案，e.g:  { "buy": "Buy" } */
export type MessageRecord = Record<string, MessageValue>;

export type EntryValue = {
  [lang in Locale]?: MessageValue;
} & {
  /** ISO 时间字符串 */
  last_update?: string;
};

export type I18nDBEntry = Record<string, EntryValue>; // key -> EntryValue

/**
 * i18n 数据库结构
 */
export interface I18nDB {
  source_lang: Locale;
  non_translatable: string[];
  glossary: { [key: string]: string }[];
  entries: I18nDBEntry;
}

/**
 * i18n 配置
 */
export interface I18nConfig {
  source_file: string;
  source_lang: Locale;
  target_langs: Locale[];
  db_file: string;
  service: {
    provider: string;
    model: string;
    base_url: string;
    api_key: string;
    temperature: number;
    max_tokens: number;
    /** 开启后，在将语言数据提交到大模型前，会将 key 替换为递增数字，节约 token */
    compress_keys: boolean;
  };
  /**
   * 特定翻译的词汇表
   * ```json
   * e.g: {
   *  "zh-CN": [{ "Crypto": "加密货币" }],
   *  "ja": [{ "Crypto": "暗号通貨" }]
   * }
   * ```
   */
  glossary: Partial<Record<Locale, { [originText: string]: string }[]>>;
  // glossary: {
  //   [key?: Locale]: { [originText: string]: string }[];
  // };
  /** 无需翻译的词汇、术语 */
  non_translatable: string[];
  output: {
    format: 'nested' | 'flat'; // nested | flat
    indent: number; // JSON 缩进
  };
  /** 提示词模版 */
  prompt_template: string;
}
