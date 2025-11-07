/** ========== i18n-cli 动态插入内容 开始========== */
const i18nDB = {
  "source_lang": "zh-CN",
  "non_translatable": [],
  "glossary": {},
  "entries": {
    "welcome_message": {
      "zh-TW": "歡迎使用 i18n-cli！",
      "zh-CN": "欢迎使用 i18n-cli！",
      "last_update": "2025-11-05T03:55:19.326Z",
      "en-US": "Welcome to i18n-cli!"
    },
    "hello": {
      "zh-TW": "{name}, 你好！",
      "zh-CN": "{name}, 你好！",
      "last_update": "2025-11-05T03:55:19.326Z",
      "en-US": "{name}, hello!"
    },
    "hello2": {
      "en-US": "Hello, {name}!",
      "zh-CN": "你好, {name}!",
      "last_update": "2025-11-05T06:43:24.421Z",
      "zh-TW": "你好, {name}！"
    },
    "hello3": {
      "en-US": "{0} World",
      "zh-CN": "{0} 世界",
      "last_update": "2025-11-05T06:50:12.931Z",
      "zh-TW": "{0} 世界"
    },
    "address": {
      "en-US": "{account}{'@'}{domain}",
      "zh-CN": "{account}{'@'}{domain}",
      "last_update": "2025-11-07T03:03:06.616Z",
      "zh-TW": "{account}{'@'}{domain}"
    }
  }
};

let targetLang = '';

/** ========== i18n-cli 动态生成内容 结束========== */

/** ========== 模版内容 开始 ========== */
/**
 * 国际化文本编辑器
 * 功能：在页面上标记可编辑的国际化文本，提供可视化编辑界面
 */

// -------- 配置常量 --------
const CONFIG = {
  // DOM 相关
  HIGHLIGHT_ATTR: 'data-i18n-editable',
  WRAPPER_CLASS: 'i18n-editor-wrapper',
  EDITOR_CLASS: 'i18n-edit-overlay',
  BADGE_CLASS: 'i18n-badge',
  CANDIDATE_CLASS: 'i18n-candidate',
  ACTIVE_CANDIDATE_CLASS: 'active',

  // 样式
  HIGHLIGHT_STYLE: {
    outline: '1px dashed rgba(255, 99, 71, 0.8)',
    cursor: 'pointer',
    borderRadius: '2px',
  },

  // 性能
  DEBOUNCE_DELAY: 300,

  // 文本
  EDIT_MODE_ON: '关闭编辑模式',
  EDIT_MODE_OFF: '打开编辑模式',
  EXPORT_BUTTON_TEXT: '导出修改数据',
  CLEAR_BUTTON_TEXT: '重置修改',
  LANGUAGE_LABEL_TEXT: '请选择当前页面显示的语言: ',

  // 编辑器文本
  EDIT_TITLE: '编辑翻译',
  CANDIDATE_KEYS_LABEL: '候选键:',
  CURRENT_TEXT_LABEL: '当前渲染文本:',
  SOURCE_LANGUAGE_LABEL: '源语言:',
  EDIT_PLACEHOLDER: '编辑翻译',
  SAVE_BUTTON_TEXT: '保存',
  CANCEL_BUTTON_TEXT: '取消',

  // 文件名
  EXPORT_FILENAME: 'i18n.db.json',
};

// -------- 全局状态 --------
let isEditModeActive = false;
let uiRoot = null;
let styleElement = null;
let currentEditor = null;
let mutationObserver = null;
let updateTimer = null;

// i18nDB 由被外部插入到顶部

// 生成反向映射
const reverseMap = generateReverseMap(
  i18nDB.entries,
  Object.keys(i18nDB.entries).reduce(function (langs, key) {
    const entry = i18nDB.entries[key];
    Object.keys(entry).forEach(function (lang) {
      if (lang !== 'last_update' && !langs.includes(lang)) {
        langs.push(lang);
      }
    });
    return langs;
  }, []),
);

// ========== 改进的辅助函数：支持字面量插值的 pattern 解析 ==========
function patternToRegexAndNames(patternText) {
  const parts = [];
  const names = [];
  const literals = [];
  let lastIndex = 0;

  // 改进的正则：区分 {variable} 和 {'literal'} 两种模式
  const placeholderRegex = /\{([^}]+)\}/g;
  let match;

  while ((match = placeholderRegex.exec(patternText)) !== null) {
    const before = patternText.slice(lastIndex, match.index);
    parts.push(escapeForRegex(before));

    const content = match[1];

    // 检查是否是字面量插值 {'literal'}
    if (content.startsWith("'") && content.endsWith("'")) {
      // 字面量插值：直接使用字面值
      const literalValue = content.slice(1, -1);
      parts.push(escapeForRegex(literalValue));
      literals.push({
        index: match.index,
        value: literalValue,
      });
    } else {
      // 变量插值：使用捕获组
      parts.push('(.+?)');
      names.push(content);
    }

    lastIndex = match.index + match[0].length;
  }

  parts.push(escapeForRegex(patternText.slice(lastIndex)));
  const regexString = '^' + parts.join('') + '$';
  const regex = new RegExp(regexString);
  return { regex: regex, names: names, literals: literals };
}

function escapeForRegex(text) {
  return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// ========== 改进的辅助函数：支持字面量插值的模板渲染 ==========
function renderTemplateUsingMatch(templateText, names, matchGroups, literals) {
  let result = templateText;

  // 先处理字面量插值 - 将 {'literal'} 替换为 literal
  literals.forEach(function (literal) {
    const literalPlaceholder = `{'${literal.value}'}`;
    result = result.replace(new RegExp(escapeForRegex(literalPlaceholder), 'g'), literal.value);
  });

  // 然后处理变量插值
  result = result.replace(/\{([^}]+)\}/g, function (full, key) {
    // 跳过已经被处理的字面量（理论上不应该再出现，但为了安全）
    if (
      literals.some(function (literal) {
        return `{'${literal.value}'}` === full || literal.value === key;
      })
    ) {
      return full;
    }

    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      return matchGroups[index + 1] !== undefined ? matchGroups[index + 1] : full;
    }

    const position = names.indexOf(key);
    if (position !== -1 && matchGroups[position + 1] !== undefined) {
      return matchGroups[position + 1];
    }

    return full;
  });

  return result;
}

// ========== 新函数：渲染页面显示文本 ==========
function renderDisplayText(templateText, placeholderNames, placeholderValues, literals) {
  // 在页面上显示时，我们需要使用实际的占位符值来渲染
  let result = templateText;

  // 处理字面量插值
  literals.forEach(function (literal) {
    const literalPlaceholder = `{'${literal.value}'}`;
    result = result.replace(new RegExp(escapeForRegex(literalPlaceholder), 'g'), literal.value);
  });

  // 处理变量插值
  placeholderNames.forEach(function (name, index) {
    const value = placeholderValues[index];
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${escapeForRegex(name)}\\}`, 'g'), value);
    }
  });

  return result;
}

// -------- 工具函数 --------
function normalizeText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCurrentDisplayValue(normalizedText, keys) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const currentValue = i18nDB.entries[key]?.[targetLang];
    if (currentValue && currentValue !== normalizedText) {
      return currentValue;
    }
  }
  return normalizedText;
}

function generateReverseMap(entries, targetLanguages) {
  const reverseMapResult = {};

  for (const key in entries) {
    const entry = entries[key];

    for (let i = 0; i < targetLanguages.length; i++) {
      const lang = targetLanguages[i];
      const text = entry[lang];

      if (!text) continue;
      if (typeof text !== 'string') continue;

      if (!reverseMapResult[lang]) {
        reverseMapResult[lang] = {};
      }

      if (!reverseMapResult[lang][text]) {
        reverseMapResult[lang][text] = [];
      }

      reverseMapResult[lang][text].push(key);
    }
  }

  return reverseMapResult;
}

// -------- 文本节点处理核心逻辑 --------
function processTextNode(node) {
  if (!node || !node.nodeValue) return null;

  const originalText = node.nodeValue;
  const normalizedText = normalizeText(originalText);
  if (!normalizedText) return null;

  if (node.parentElement?.closest(`.${CONFIG.WRAPPER_CLASS}`)) return null;
  if (node.parentElement?.classList.contains(CONFIG.EDITOR_CLASS)) return null;
  if (node.parentElement?.hasAttribute(CONFIG.HIGHLIGHT_ATTR)) return null;
  if (node.parentElement?.dataset?.i18nModified === 'true') return null;

  let matchingKeys = reverseMap[targetLang]?.[normalizedText];
  let matchedNames = null;
  let matchedGroups = null;
  let matchedLiterals = null;

  if (!matchingKeys) {
    const langMap = reverseMap[targetLang] || {};
    const patternTexts = Object.keys(langMap);

    for (let i = 0; i < patternTexts.length; i++) {
      const patternText = patternTexts[i];
      // 检查是否包含插值（变量或字面量）
      if (/\{[^}]+\}/.test(patternText)) {
        const regexAndNames = patternToRegexAndNames(patternText);
        const match = regexAndNames.regex.exec(normalizedText);
        if (match) {
          matchingKeys = langMap[patternText];
          matchedNames = regexAndNames.names;
          matchedGroups = match;
          matchedLiterals = regexAndNames.literals;
          break;
        }
      }
    }
  }

  if (!matchingKeys) return null;

  let currentDisplayValue;
  if (matchedGroups && matchingKeys.length > 0) {
    const chosenKey = matchingKeys[0];
    const templateText = i18nDB.entries[chosenKey]?.[targetLang] || normalizedText;
    currentDisplayValue = renderTemplateUsingMatch(templateText, matchedNames, matchedGroups, matchedLiterals || []);
  } else {
    currentDisplayValue = getCurrentDisplayValue(normalizedText, matchingKeys);
  }

  const span = document.createElement('span');
  span.setAttribute(CONFIG.HIGHLIGHT_ATTR, 'true');
  span.className = 'i18n-editable';
  Object.assign(span.style, CONFIG.HIGHLIGHT_STYLE);

  span.dataset.i18nKeys = JSON.stringify(matchingKeys);
  span.dataset.originalText = originalText;
  span.dataset.normalizedText = normalizedText;

  if (matchedNames && matchedGroups) {
    span.dataset.placeholderNames = JSON.stringify(matchedNames);
    span.dataset.placeholderValues = JSON.stringify(matchedGroups.slice(1));
    span.dataset.literals = JSON.stringify(matchedLiterals || []);
  } else {
    span.dataset.placeholderNames = JSON.stringify([]);
    span.dataset.placeholderValues = JSON.stringify([]);
    span.dataset.literals = JSON.stringify([]);
  }

  span.textContent = currentDisplayValue;
  return span;
}

// -------- DOM 遍历和标记 --------
function findTextNodes(root) {
  const walker = document.createTreeWalker(
    root || document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        if (!node.nodeValue || !normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(`.${CONFIG.WRAPPER_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.hasAttribute(CONFIG.HIGHLIGHT_ATTR)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(`.${CONFIG.EDITOR_CLASS}`)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false,
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function markMatchedTextNodes() {
  const textNodes = findTextNodes();
  textNodes.forEach(function (node) {
    const span = processTextNode(node);
    if (span) {
      node.parentNode.replaceChild(span, node);
    }
  });
}

function markTextNodesWithin(root) {
  if (!root || !(root instanceof Node)) return;
  if (root.closest?.(`.${CONFIG.WRAPPER_CLASS}`) || root.classList?.contains(CONFIG.EDITOR_CLASS)) {
    return;
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        if (!node.nodeValue || !normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(`.${CONFIG.WRAPPER_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.classList.contains(CONFIG.EDITOR_CLASS)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.hasAttribute(CONFIG.HIGHLIGHT_ATTR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false,
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(function (node) {
    const span = processTextNode(node);
    if (span) {
      node.parentNode.replaceChild(span, node);
    }
  });
}

function removeAllMarkers() {
  const markedElements = document.querySelectorAll(`span[${CONFIG.HIGHLIGHT_ATTR}]`);
  markedElements.forEach(function (span) {
    const currentText = span.textContent;
    const textNode = document.createTextNode(currentText);
    span.parentNode.replaceChild(textNode, span);
  });
}

// -------- 用户界面 --------
function injectEditorStyles() {
  if (styleElement) return;

  styleElement = document.createElement('style');
  styleElement.textContent = `
    .${CONFIG.WRAPPER_CLASS} { 
      position: fixed; 
      right: 12px; 
      bottom: 12px; 
      z-index: 999999; 
      font-family: Arial, sans-serif; 
    }
    .${CONFIG.WRAPPER_CLASS} .btn { 
      display: inline-block; 
      padding: 8px 10px; 
      margin: 4px; 
      background: #111827; 
      color: #fff; 
      border-radius: 6px; 
      cursor: pointer; 
      font-size: 13px; 
    }
    .${CONFIG.EDITOR_CLASS} { 
      position: fixed; 
      z-index: 999999; 
      background: #fff; 
      color: #000; 
      border: 1px solid #ddd; 
      box-shadow: 0 6px 18px rgba(0,0,0,0.12); 
      padding: 12px; 
      border-radius: 8px; 
      min-width: 320px; 
      max-width: 640px; 
    }
    .${CONFIG.EDITOR_CLASS} h4 { 
      margin: 0 0 8px 0; 
      font-size: 13px; 
    }
    .${CONFIG.EDITOR_CLASS} textarea { 
      width: 100%; 
      height: 100px; 
      font-size: 13px; 
      padding: 8px; 
      box-sizing: border-box; 
      border: 1px solid #ddd;
    }
    .${CONFIG.EDITOR_CLASS} .row { 
      margin-bottom: 8px; 
      font-size: 13px; 
    }
    .${CONFIG.EDITOR_CLASS} button { 
      padding: 1px 6px; 
      border: 1px solid #ddd; 
      border-radius: 4px; 
      background: rgb(240, 240, 240); 
      cursor: pointer; 
      font-size: 14px; 
    }
    .${CONFIG.BADGE_CLASS} { 
      font-size: 11px; 
      color: #fff; 
      background: #6b7280; 
      padding: 2px 6px; 
      border-radius: 6px; 
      margin-left: 8px; 
    }
    .${CONFIG.CANDIDATE_CLASS} { 
      font-size: 12px; 
      padding: 6px; 
      border-radius: 6px; 
      cursor: pointer; 
      display: inline-block; 
      border: 1px solid #eee; 
      margin-right: 6px; 
    }
    .${CONFIG.CANDIDATE_CLASS}.${CONFIG.ACTIVE_CANDIDATE_CLASS} { 
      border-color: #2563eb; 
      background: #eef2ff; 
    }
  `;

  document.head.appendChild(styleElement);
}

function createButton(text, onClick) {
  const button = document.createElement('div');
  button.className = 'btn';
  button.textContent = text;
  button.onclick = onClick;
  return button;
}

function createSelect(options, selectedValue, onChange) {
  options.unshift({ value: '', text: '--请选择当前页面显示的语言--' });

  const select = document.createElement('select');
  select.className = 'select';

  options.forEach(function (option) {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;

    if (option.value === selectedValue) {
      optionElement.selected = true;
    }

    select.appendChild(optionElement);
  });

  if (onChange) {
    select.onchange = onChange;
  }

  return select;
}

function createControlPanel() {
  if (uiRoot) return uiRoot;

  uiRoot = document.createElement('div');
  uiRoot.className = CONFIG.WRAPPER_CLASS;

  const toggleButton = createButton(CONFIG.EDIT_MODE_OFF, function (event) {
    // 没有选择语言，不允许开启编辑模式
    if (!targetLang && !isEditModeActive) {
      alert('先选择当前页面显示的语言');
      return;
    }

    isEditModeActive = !isEditModeActive;
    if (isEditModeActive) {
      event.target.textContent = CONFIG.EDIT_MODE_ON;
      activateEditMode();
    } else {
      event.target.textContent = CONFIG.EDIT_MODE_OFF;
      deactivateEditMode();
    }
  });

  const exportButton = createButton(CONFIG.EXPORT_BUTTON_TEXT, function () {
    downloadFile(CONFIG.EXPORT_FILENAME, JSON.stringify(i18nDB, null, 2));
  });

  const clearButton = createButton(CONFIG.CLEAR_BUTTON_TEXT, function () {
    if (confirm('确定要清空所有修改记录吗，确认后将刷新页面？')) window.location.reload();
  });

  const label = document.createElement('label');
  label.textContent = CONFIG.LANGUAGE_LABEL_TEXT;

  const langOptions = Object.keys(reverseMap).map(function (item) {
    return { value: item, text: item };
  });
  const select = createSelect(langOptions, '', function (event) {
    switchLanguage(event.target.value);
  });

  uiRoot.appendChild(label);
  uiRoot.appendChild(select);
  uiRoot.appendChild(toggleButton);
  uiRoot.appendChild(exportButton);
  uiRoot.appendChild(clearButton);

  document.body.appendChild(uiRoot);
  return uiRoot;
}

// -------- 编辑弹窗 --------
function openEditorForElement(targetElement) {
  closeEditor();
  const keys = JSON.parse(targetElement.dataset.i18nKeys || '[]');
  const normalizedText = targetElement.dataset.normalizedText || targetElement.textContent;
  const originalText = targetElement.dataset.originalText || targetElement.textContent;
  const selectedKey = keys[0];

  const editorOverlay = createEditorOverlay(targetElement, keys, selectedKey, normalizedText, originalText);
  document.body.appendChild(editorOverlay);
  positionEditorOverlay(editorOverlay, targetElement);
  currentEditor = editorOverlay;
}

function createEditorOverlay(targetElement, keys, selectedKey, normalizedText, originalText) {
  const overlay = document.createElement('div');
  overlay.className = CONFIG.EDITOR_CLASS;
  overlay.setAttribute('role', 'dialog');

  const title = document.createElement('h4');
  const badge = document.createElement('span');
  badge.className = CONFIG.BADGE_CLASS;
  badge.textContent = targetLang;
  title.textContent = CONFIG.EDIT_TITLE + ' ';
  title.appendChild(badge);
  overlay.appendChild(title);

  if (keys.length > 1) {
    overlay.appendChild(createKeySelectionRow(keys, selectedKey, overlay));
  }

  overlay.appendChild(createInfoRow(CONFIG.CURRENT_TEXT_LABEL, originalText));
  overlay.appendChild(createInfoRow(i18nDB.source_lang + ':', i18nDB.entries[selectedKey]?.[i18nDB.source_lang] || ''));
  overlay.appendChild(createTextareaRow(selectedKey));
  overlay.appendChild(createButtonRow(targetElement, selectedKey, overlay));

  return overlay;
}

function createKeySelectionRow(keys, selectedKey, overlay) {
  const row = document.createElement('div');
  row.className = 'row';

  const label = document.createElement('div');
  label.style.marginBottom = '6px';
  label.style.fontSize = '12px';
  label.style.color = '#374151';
  label.textContent = CONFIG.CANDIDATE_KEYS_LABEL;
  row.appendChild(label);

  keys.forEach(function (key) {
    const keyElement = document.createElement('span');
    keyElement.className = CONFIG.CANDIDATE_CLASS + (key === selectedKey ? ' ' + CONFIG.ACTIVE_CANDIDATE_CLASS : '');
    keyElement.textContent = key;
    keyElement.onclick = function () {
      overlay.querySelectorAll('.' + CONFIG.CANDIDATE_CLASS).forEach(function (element) {
        element.classList.remove(CONFIG.ACTIVE_CANDIDATE_CLASS);
      });
      keyElement.classList.add(CONFIG.ACTIVE_CANDIDATE_CLASS);
      overlay.querySelector('textarea').value = i18nDB.entries[key]?.[targetLang] || '';
      overlay._selectedKey = key;
    };
    row.appendChild(keyElement);
  });

  return row;
}

function createInfoRow(label, value) {
  const row = document.createElement('div');
  row.className = 'row';

  const strong = document.createElement('strong');
  strong.textContent = label;

  const span = document.createElement('span');
  span.style.color = '#111';
  span.textContent = value;

  row.appendChild(strong);
  row.appendChild(span);
  return row;
}

function createTextareaRow(selectedKey) {
  const row = document.createElement('div');
  row.className = 'row';
  const textarea = document.createElement('textarea');
  textarea.value = i18nDB.entries[selectedKey]?.[targetLang] || '';
  textarea.placeholder = CONFIG.EDIT_PLACEHOLDER + ' ' + targetLang;
  row.appendChild(textarea);
  return row;
}

function createButtonRow(targetElement, selectedKey, overlay) {
  const row = document.createElement('div');
  row.style.textAlign = 'right';

  const saveButton = document.createElement('button');
  saveButton.textContent = CONFIG.SAVE_BUTTON_TEXT;
  saveButton.style.marginRight = '8px';
  saveButton.onclick = function () {
    handleSave(targetElement, selectedKey, overlay);
  };

  const cancelButton = document.createElement('button');
  cancelButton.textContent = CONFIG.CANCEL_BUTTON_TEXT;
  cancelButton.onclick = closeEditor;

  row.appendChild(saveButton);
  row.appendChild(cancelButton);
  return row;
}

function handleSave(targetElement, selectedKey, overlay) {
  const keyToSave = overlay._selectedKey || selectedKey;
  const textarea = overlay.querySelector('textarea');
  const newValue = textarea.value;
  const oldValue = i18nDB.entries[keyToSave]?.[targetLang] || '';

  if (newValue === oldValue) {
    alert('未检测到更改。');
    return;
  }

  if (!i18nDB.entries[selectedKey]) {
    i18nDB.entries[selectedKey] = {};
  }

  i18nDB.entries[selectedKey][targetLang] = newValue;
  i18nDB.entries[selectedKey].last_update = new Date().toISOString();

  if (!reverseMap[targetLang]) {
    reverseMap[targetLang] = {};
  }

  reverseMap[targetLang][newValue] = reverseMap[targetLang][oldValue] || [selectedKey];
  delete reverseMap[targetLang][oldValue];

  // 修复：在页面上显示时，使用实际的占位符值来渲染
  let renderedForDisplay = newValue;

  try {
    const placeholderNames = JSON.parse(targetElement.dataset.placeholderNames || '[]');
    const placeholderValues = JSON.parse(targetElement.dataset.placeholderValues || '[]');
    const literals = JSON.parse(targetElement.dataset.literals || '[]');

    // 使用新的渲染函数来显示页面文本
    renderedForDisplay = renderDisplayText(newValue, placeholderNames, placeholderValues, literals);
  } catch (error) {
    console.warn('[i18n-editor] 无法读取 placeholder 数据：', error);
    // 如果解析失败，直接使用新值
    renderedForDisplay = newValue;
  }

  targetElement.textContent = renderedForDisplay;
  targetElement.dataset.i18nModified = 'true';

  // 更新占位符数据（如果模板结构发生变化）
  const hasPlaceholdersNow = /\{[^}]+\}/.test(newValue);
  if (!hasPlaceholdersNow) {
    targetElement.dataset.placeholderNames = JSON.stringify([]);
    targetElement.dataset.placeholderValues = JSON.stringify([]);
    targetElement.dataset.literals = JSON.stringify([]);
  } else {
    // 如果模板仍然包含占位符，保持现有的占位符数据
    // 注意：这里假设占位符的结构没有改变
    // 如果结构改变了，可能需要重新解析模板
  }

  closeEditor();
}

function positionEditorOverlay(overlay, targetElement) {
  const targetRect = targetElement.getBoundingClientRect();
  const overlayHeight = overlay.offsetHeight;
  const spaceAbove = targetRect.top;

  overlay.style.top =
    (spaceAbove > overlayHeight + 20
      ? targetRect.top - overlayHeight - 8 + window.scrollY
      : targetRect.bottom + 8 + window.scrollY) + 'px';

  overlay.style.left = Math.min(window.innerWidth - 360, targetRect.left + window.scrollX) + 'px';
}

function closeEditor() {
  if (currentEditor?.parentNode) {
    currentEditor.parentNode.removeChild(currentEditor);
  }
  currentEditor = null;
}

// -------- 全局事件 --------
function handleEditableSpanClick(event) {
  const span = event.target.closest(`span[${CONFIG.HIGHLIGHT_ATTR}]`);
  if (!span) return;

  event.preventDefault();
  event.stopPropagation();
  openEditorForElement(span);
}

// -------- 主模式切换 --------
function activateEditMode() {
  injectEditorStyles();
  createControlPanel();

  removeAllMarkers();
  markMatchedTextNodes();

  document.querySelectorAll(`span[${CONFIG.HIGHLIGHT_ATTR}]`).forEach(function (span) {
    span.addEventListener('click', handleEditableSpanClick);
  });

  if (!mutationObserver) {
    mutationObserver = new MutationObserver(function (mutations) {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(function () {
        const addedNodes = [];
        for (let i = 0; i < mutations.length; i++) {
          const mutation = mutations[i];
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (let j = 0; j < mutation.addedNodes.length; j++) {
              addedNodes.push(mutation.addedNodes[j]);
            }
          }
        }

        if (addedNodes.length === 0) return;

        addedNodes.forEach(function (node) {
          markTextNodesWithin(node);
        });

        document.querySelectorAll(`span[${CONFIG.HIGHLIGHT_ATTR}]`).forEach(function (span) {
          if (!span._i18nClickBound) {
            span.addEventListener('click', handleEditableSpanClick);
            span._i18nClickBound = true;
          }
        });

        console.log('[i18n-editor] 检测到 DOM 变化，已为新增内容添加 i18n 编辑标记。');
      }, CONFIG.DEBOUNCE_DELAY);
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  console.log('[i18n-editor] 编辑模式已启用。监听 DOM 变化中...');
}

function deactivateEditMode() {
  closeEditor();
  document.querySelectorAll(`span[${CONFIG.HIGHLIGHT_ATTR}]`).forEach(function (span) {
    span.removeEventListener('click', handleEditableSpanClick);
  });

  removeAllMarkers();
  clearTimeout(updateTimer);

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  console.log('[i18n-editor] 编辑模式已停用。');
}

// -------- 语言切换 --------
function switchLanguage(language) {
  if (targetLang === language) return;
  targetLang = language;

  if (isEditModeActive) {
    removeAllMarkers();
    markMatchedTextNodes();
    document.querySelectorAll(`span[${CONFIG.HIGHLIGHT_ATTR}]`).forEach(function (span) {
      span.addEventListener('click', handleEditableSpanClick);
    });
  }
}

// -------- 初始化 --------
injectEditorStyles();
createControlPanel();
console.log('[i18n-editor] 就绪。使用右下角的"切换i18n编辑模式"按钮开始编辑。');

/** ========== 模版内容 结束 ========== */
