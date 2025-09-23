import { I18nDBEntry, Locale } from '../types/i18n';

export interface PrepareOptions {
  source_lang: Locale; // 主语言字段名
  cache?: I18nDBEntry; // 已有缓存内容
}

/**
 * 扁平化嵌套对象
 * input: { menu: { login: "登陆" } }
 * output: { "menu.login": "登陆" }
 */
function flattenObject(obj: Record<string, any>, prefix = '', result: Record<string, string> = {}) {
  for (const key in obj) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      flattenObject(val, newKey, result);
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

/**
 * 生成临时数据文件对象
 */
export function flattenAndPrepare(sourceData: Record<string, any>, options: PrepareOptions): I18nDBEntry {
  const { source_lang, cache = {} } = options;

  const flatSource = flattenObject(sourceData);
  const tempData: I18nDBEntry = {};

  for (const key in flatSource) {
    let value = flatSource[key];

    if (!cache[key]) {
      // key 不存在 → 新增
      tempData[key] = { [source_lang]: value };
    } else {
      const cachedEntry = cache[key];
      if (cachedEntry[source_lang] === value) {
        // 文案未变 → 复用整个缓存
        tempData[key] = { ...cachedEntry };
      } else {
        // 文案变更 → 替换原文，清空其他语言字段
        tempData[key] = { [source_lang]: value };
      }
    }
  }

  return tempData;
}

/**
 * 将扁平化对象还原为树形结构
 * { "menu.login": "登录" } → { menu: { login: "登录" } }
 */
export function unflatten(data: Record<string, string | any[]>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in data) {
    const value = data[key];
    const keys = key.split('.');

    let current = result;
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        current[k] = value;
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  }

  return result;
}
