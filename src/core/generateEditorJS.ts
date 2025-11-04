import fs from 'fs';
import path from 'path';
import { I18nConfig, I18nDB, I18nDBEntry, Locale } from '../types/i18n';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ReverseMap = Partial<Record<Locale, Record<string, string[]>>>;

/**
 * 生成反查表
 *
 * 例如：
 * ```js
 * const reverseMap = {
 *   'zh-CN': {
 *     您支付: ['pages.edit.youPay'],
 *     您获得: ['pages.edit.youGet'],
 *     继续: ['pages.edit.continue'],
 *   },
 *   'en-US': {
 *     'You pay': ['pages.edit.youPay'],
 *     'You get': ['pages.edit.youGet'],
 *     Continue: ['pages.edit.continue'],
 *   },
 * };
 * ```
 */
export function generateReverseMap(entries: I18nDBEntry, target_langs: Locale[]): ReverseMap {
  const reverseMap: ReverseMap = {};

  // 遍历所有条目
  for (const key in entries) {
    const entry = entries[key];

    // 遍历每种语言
    for (const lang of target_langs) {
      const text = entry[lang];

      if (!text) continue;

      // 不支持非字符串的反查
      if (typeof text !== 'string') continue;

      // 确保该语言在 reverseMap 中存在
      if (!reverseMap[lang]) {
        reverseMap[lang] = {};
      }

      // 初始化该文本的反查数组
      if (!reverseMap[lang]![text]) {
        reverseMap[lang]![text] = [];
      }

      // 将键添加到对应的文本下
      reverseMap[lang]![text].push(key);
    }
  }

  return reverseMap;
}

export function generateEditorJS(i18nDB: I18nDB, config: I18nConfig) {
  const reverseMap = generateReverseMap(i18nDB.entries, config.target_langs);

  // 使用包内的相对路径
  const templatePath = path.resolve(__dirname, '../editor.template.js');
  const scriptTemplate = fs.readFileSync(templatePath, 'utf-8');

  const scriptContent = `const reverseMap = ${JSON.stringify(reverseMap, null, 2)};
  
const i18nDB = ${JSON.stringify(i18nDB, null, 2)};

let targetLang = '${config.target_langs[0]}';

${scriptTemplate}`;

  // 输出文件路径
  const filePath = config.editor_js_file || '.i18n/editor.js';
  const outputFile = path.resolve(process.cwd(), filePath);
  fs.writeFileSync(outputFile, scriptContent, 'utf-8');
}
