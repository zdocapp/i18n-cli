# i18n CLI

多语言翻译工具，实现 **自动翻译 + 翻译复用 + 校对闭环**，降低多语言维护成本。

---

## 核心能力

- **自动翻译**：新增/修改文案自动生成目标语言内容
- **增量更新**：仅翻译新增或修改文案，保证文案的一致性
- **校对闭环**：修数据 + 运行导出（i18n.db.json → i18n run → 各语言包）
- **多语言支持**：支持任意目标语言，可扩展术语表(无需翻译的术语)，词汇表(特定翻译的术语)
- **大模型支持**：支持任意OpenAI兼容大模型

---

## 快速使用

### 安装

```bash
npm install -g @zdoc.app/i18n-cli
```

### 初始化

```bash
i18n init
```

会在当前目录生成 `i18n.config.json`，需要根据项目情况调整配置：

````ts
export const defaultConfig: I18nConfig = {
  source_file: 'src/locale/en-US.json', // 主语言文件, 相对于执行命令的路径，需要根据实际情况修改
  source_lang: 'en-US', // 主语言
  target_langs: ['zh-CN'], // 需要翻译的目标语言列表, 可配置多个
  db_file: 'i18n.db.json', // 翻译缓存文件, 默认在当前目录生成，一般不需要修改
  service: {
    provider: 'deepseek', // 该字段在程序中未使用，可忽略
    model: 'deepseek-chat', // 大模型名称，需要根据实际使用的服务商修改
    base_url: 'https://api.deepseek.com', // API 请求地址，需要根据实际使用的服务商修改
    api_key: '{{OPENAI_API_KEY}}', // API Key，支持使用环境变量 {{VAR_NAME}} 的形式, 也可直接写入实际的 key
    temperature: 0.3, // https://api-docs.deepseek.com/zh-cn/quick_start/parameter_settings
    max_tokens: 4000, // 程序目前按照 1000 tokens 拆分请求，max_tokens 保持 4000 即可
    compress_keys: false, // 开启后，在将语言数据提交到大模型前，会将 key 替换为递增数字，节约 token, 但会丢失 key 部分的语义信息，可能会影响翻译效果
  },
  /**
   * 特定翻译的词汇表
   * ```json
   * e.g: {
   *  "zh-CN": [{ "Crypto": "加密货币" }],
   *  "ja": [{ "Crypto": "暗号通貨" }]
   * }
   * ```
   */
  glossary: {},
  /** 无需翻译的词汇、术语 */
  non_translatable: [],
  output: {
    format: 'nested', // nested | flat 输出的语言包风格，需要和主语言包一致（注意 key 不要使用英文句号， 否则可能会导致导出的语言包结构出现异常）
    indent: 2, // JSON 缩进
  },
  /**
   * 提示词模版-可根据自身需要随意调整提示词模版
   *
   * 以下固定占位符会在构建提示词阶段替换为实际值，可根据需要调整位置，不要修改名称：
   * {{language}}
   * {{glossary}}
   * {{nonTranslatable}}
   */
  prompt_template: `你是一名专业的前端本地化(i18n)翻译专家，专门处理 Web 界面文案翻译。

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
````

### 自动翻译

```bash
i18n run
```

- 解析主语言包
- 对比缓存
- 生成或复用翻译
- 输出目标语言包（如 `zh-CN.json`、`es.json`）

### 校验语言包

```bash
i18n check
```

- 检查文案条数是否一致
- 确认每条主语言文案都有译文

---

## 数据文件示例

`i18n.db.json` 保存原文、翻译， 作为语言包数据来源：

```json
{
  "sourceLang": "en-US",
  "entries": {
    "key1": { "en-US": "Log in", "zh-CN": "登录", "last_update": "2025-09-16T16:28:00Z" }
  }
}
```

---

## 核心命令

| 命令          | 功能                                         |
| ------------- | -------------------------------------------- |
| `i18n init`   | 初始化配置                                   |
| `i18n run`    | 翻译 & 导出语言包                            |
| `i18n check`  | 校验语言包完整性                             |
| `i18n export` | 将语言数据导出为 excel                       |
| `i18n import` | 从 excel 导入数据，更新数据文件 i18n.db.json |

---

## 使用流程

1. 开发新增文案 → 执行 `i18n run`
2. 校对修改 `i18n.db.json`
3. 再次执行 `i18n run` → 更新语言包

已支持导出 excel 文件，校对人员可基于 excel 文件修改文案，修改后再由开发者导入到数据文件后重新执行 run 即可：

1. `i18n export` 导出为 excel
2. 校对&修改
3. `i18n import -s i18n.xlsx` 导入数据
4. `i18n run` 重新导出语言包

## 支持语言

完整列表查看：`src/constants/languages.ts`

```ts
/**
 * 支持的语言列表, 主要用于构建 prompt
 *
 * config.source_lang & config.target_langs 中的语言代码必须在此列表中有对应项
 *
 * key: 语言代码，可使用 iso 639 1 标准，如： en, zh, fr 等。如需支持其它格式语言代码（如 IETF BCP 47），可补充相关映射，如： zh-CN, zh-TW, pt-BR 等
 * value: 语言名称（中文 + 该语言自称）- 非严格规范，主要用于大模型理解目标语言。
 */
export const languages = {
  zh: '简体中文',
  'zh-CN': '简体中文',
  'zh-TW': '繁体中文-台湾 (繁體中文-台湾)',
  en: '英语 (English)',
  'en-US': '英语 (English)',
  es: '西班牙语 (Español)',
  fr: '法语 (Français)',
  ru: '俄语 (Русский)',
  pt: '葡萄牙语 (Português)',
};
```

---

## 实现功能

- [x] 不会重复翻译未变化内容
- [x] 增量翻译新增内容
- [x] 主动修改译文后(修改 db)，可以导出正确的语言包
- [x] 修改主语言文案，重新同步，译文会更新
- [x] 修改主语言 key，语言包可以正确更新
- [x] 支持压缩 key：使用数字替换，更稳定 & 节约 token （会丢失掉 key 部分的上下文）
- [x] 支持专业术语-无需翻译的术语、特定用法
- [x] 支持固定翻译-自定义某些词语的翻译，以便更贴合业务场景
- [x] 语言包校对：文案条目数量一致
- [x] 语言包校对：每条文案都有对应的译文
- [x] 将提示词迁移至配置文件
- [x] api_key 支持使用环境变量
- [x] 导出 excel
- [x] 导入 excel 更新翻译数据 i18n.db.json
