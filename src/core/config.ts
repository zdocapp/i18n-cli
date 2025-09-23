import path from 'path';
import fs from 'fs';
import { I18nConfig } from '../types/i18n.js';
import { logger } from '../utils/logger.js';
import 'dotenv/config'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

export const defaultConfig: I18nConfig = {
  source_file: 'en-US.json',
  source_lang: 'en-US',
  target_langs: ['zh-CN'],
  db_file: 'i18n.db.json',
  service: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    base_url: '',
    api_key: '{{OPENAI_API_KEY}}',
    temperature: 0.3,
    max_tokens: 4000,
    compress_keys: false,
  },
  glossary: {},
  non_translatable: [],
  output: {
    format: 'nested', // nested | flat
    indent: 2, // JSON 缩进
  },
  prompt_template: `
你是一名专业的前端本地化(i18n)翻译专家，专门处理 Web 界面文案翻译。

# 翻译任务
将以下 JSON 对象中的界面文案翻译成{{language}}，用于网页显示

# 必须遵守的规则
- 保持所有 key 完全不变
- 准确翻译 value 部分为目标语言：{{language}}
- 保留所有动态占位符及其原始格式，如：{xxx}
- 空字符串、纯数字、URL、HTML 标签、CSS 类名等非文本内容保持原样
- 针对按钮文本、菜单项、标签、提示语等界面元素，使用简洁明了的表达
- 确保翻译后的文本长度适合界面布局，避免过长影响显示
{{glossary}}
{{nonTranslatable}}

# 输出要求
- 只输出完整且合法的 JSON 对象
- 不要包含任何额外文本、注释或说明
- 保持与输入完全相同的 JSON 结构和格式

# 网页文案翻译指南
- 按钮文本：使用动词或动作短语，保持简短
- 菜单项：使用名词或动宾短语
- 标签和标题：保持清晰准确
- 提示信息：符合当地语言习惯
- 错误信息：提供明确的操作指引

# 输入示例
{
  "button.submit": "Submit",
  "menu.dashboard": "Dashboard",
  "title.welcome": "Welcome, {username}!",
  "error.required": "This field is required",
  "tooltip.search": "Search for products"
}

# 输出示例（目标语言：简体中文）
{
  "button.submit": "提交",
  "menu.dashboard": "控制面板",
  "title.welcome": "欢迎，{username}！",
  "error.required": "此字段为必填项",
  "tooltip.search": "搜索商品"
}

现在请翻译以下 JSON 内容：
`,
};

export function loadConfig(configPath = 'i18n.config.json'): I18nConfig {
  const absPath = path.resolve(configPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Config file not found: ${absPath}`);
  }
  const raw = fs.readFileSync(absPath, 'utf-8');
  const config = JSON.parse(raw) as I18nConfig;

  // 替换环境变量：{{API_KEY}} => process.env.API_KEY
  const match = config.service.api_key.match(/^\{\{(\w+)\}\}$/);
  if (match) {
    config.service.api_key = resolveEnvPlaceholder(config.service.api_key);

    logger.info(`Resolved API key from environment variable, env key: process.env.${match[1]}`);
  }

  return config;
}

function resolveEnvPlaceholder(str: string) {
  // const value = str.replace(/\{\{(\w+)\}\}/g, (_, name) => process.env[name] ?? '');
  const match = str.match(/^\{\{(\w+)\}\}$/);
  const name = match ? match[1] : null;

  if (!name) {
    return str; // 不符合 {{VAR_NAME}} 格式，原样返回
  }

  const value = process.env[name] ?? '';

  if (!value) {
    logger.error(
      `Environment variable for placeholder ${str} is not set or empty. Please set ${name} in your env file.`,
    );
    process.exit(1);
  }

  return value;
}
