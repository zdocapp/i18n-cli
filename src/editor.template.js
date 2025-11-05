/**
 * 国际化文本编辑器
 * 功能：在页面上标记可编辑的国际化文本，提供可视化编辑界面
 */

// -------- 配置项 --------
// 反向映射：语言 -> 页面文本 -> 国际化键名数组
// const reverseMap = {
//   'zh-CN': {
//     您支付: ['pages.edit.youPay'],
//     您获得: ['pages.edit.youGet'],
//     继续: ['pages.edit.continue'],
//   },
//   'en-US': {
//     'You pay': ['pages.edit.youPay'],
//     'You get': ['pages.edit.youGet'],
//     Continue: ['pages.edit.continue'],
//   },
// };

// 国际化数据库
// const i18nDB = {
//   source_lang: 'en-US',
//   non_translatable: [],
//   glossary: {},
//   entries: {
//     'pages.edit.youPay': {
//       'zh-CN': '您支付',
//       'en-US': 'You pay',
//       last_update: '2025-11-04T06:26:57.336Z',
//     },
//     'pages.edit.youGet': {
//       'zh-CN': '您获得',
//       'en-US': 'You get',
//       last_update: '2025-11-04T06:26:57.336Z',
//     },
//     'pages.edit.continue': {
//       'zh-CN': '继续',
//       'en-US': 'Continue',
//       last_update: '2025-11-04T06:26:57.336Z',
//     },
//   },
// };

// 目标语言配置（可切换）
// let targetLang = 'zh-CN';

// -------- 内部状态 --------
let isEditModeActive = false;
const HIGHLIGHT_ATTR = 'data-i18n-editable';
const WRAPPER_CLASS = 'i18n-editor-wrapper';
let uiRoot = null;
let styleElement = null;
let currentEditor = null;
let mutationObserver = null;
let updateTimer = null;

// i18nDB 由被外部插入到顶部

const reverseMap = generateReverseMap(
  i18nDB.entries,
  Object.keys(i18nDB.entries).reduce((langs, key) => {
    const entry = i18nDB.entries[key];
    Object.keys(entry).forEach((lang) => {
      if (lang !== 'last_update' && !langs.includes(lang)) {
        langs.push(lang);
      }
    });
    return langs;
  }, []),
);

// -------- 工具函数 --------
function normalizeText(text = '') {
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
  for (const key of keys) {
    const currentValue = i18nDB.entries[key]?.[targetLang];
    if (currentValue && currentValue !== normalizedText) {
      return currentValue;
    }
  }
  return normalizedText;
}

function generateReverseMap(entries, target_langs) {
  const reverseMap = {};

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
      if (!reverseMap[lang][text]) {
        reverseMap[lang][text] = [];
      }

      // 将键添加到对应的文本下
      reverseMap[lang][text].push(key);
    }
  }

  return reverseMap;
}

// -------- DOM 遍历和标记 --------
function findTextNodes(root = document.body) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(`.${WRAPPER_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.hasAttribute(HIGHLIGHT_ATTR)) return NodeFilter.FILTER_REJECT;
        // ✅ 排除编辑弹窗内部节点
        if (node.parentElement?.closest('.i18n-edit-overlay')) return NodeFilter.FILTER_REJECT;

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
  textNodes.forEach((node) => {
    const originalText = node.nodeValue;
    const normalizedText = normalizeText(originalText);
    if (!normalizedText) return;

    const matchingKeys = reverseMap[targetLang]?.[normalizedText];
    if (!matchingKeys) return;

    // 如果节点已被修改，跳过覆盖
    if (node.parentElement?.dataset?.i18nModified === 'true') return;

    const currentDisplayValue = getCurrentDisplayValue(normalizedText, matchingKeys);

    const span = document.createElement('span');
    span.setAttribute(HIGHLIGHT_ATTR, 'true');
    span.className = 'i18n-editable';
    span.style.outline = '1px dashed rgba(255, 99, 71, 0.8)';
    span.style.cursor = 'pointer';
    span.style.borderRadius = '2px';
    span.dataset.i18nKeys = JSON.stringify(matchingKeys);
    span.dataset.originalText = originalText;
    span.dataset.normalizedText = normalizedText;
    span.textContent = currentDisplayValue;

    node.parentNode.replaceChild(span, node);
  });
}

function markTextNodesWithin(root) {
  if (!root || !(root instanceof Node)) return;

  // 忽略编辑器 UI 自己（右下角面板或编辑弹窗）
  if (root.closest?.(`.${WRAPPER_CLASS}`) || root.classList?.contains('i18n-edit-overlay')) {
    return;
  }

  // 递归地找到 root 下的所有文本节点
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(`.${WRAPPER_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.classList.contains('i18n-edit-overlay')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.hasAttribute(HIGHLIGHT_ATTR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false,
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const originalText = node.nodeValue;
    const normalizedText = normalizeText(originalText);
    if (!normalizedText) return;

    const matchingKeys = reverseMap[targetLang]?.[normalizedText];
    if (!matchingKeys) return;

    // 如果该节点所在元素已标记为用户修改过，则跳过
    if (node.parentElement?.dataset?.i18nModified === 'true') return;

    const currentDisplayValue = getCurrentDisplayValue(normalizedText, matchingKeys);

    const span = document.createElement('span');
    span.setAttribute(HIGHLIGHT_ATTR, 'true');
    span.className = 'i18n-editable';
    span.style.outline = '1px dashed rgba(255, 99, 71, 0.8)';
    span.style.cursor = 'pointer';
    span.style.borderRadius = '2px';
    span.dataset.i18nKeys = JSON.stringify(matchingKeys);
    span.dataset.originalText = originalText;
    span.dataset.normalizedText = normalizedText;
    span.textContent = currentDisplayValue;

    node.parentNode.replaceChild(span, node);
  });
}

function removeAllMarkers() {
  const markedElements = document.querySelectorAll(`span[${HIGHLIGHT_ATTR}]`);
  markedElements.forEach((span) => {
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
    .${WRAPPER_CLASS} { position: fixed; right: 12px; bottom: 12px; z-index: 999999; font-family: Arial, sans-serif; }
    .${WRAPPER_CLASS} .btn { display: inline-block; padding: 8px 10px; margin: 4px; background: #111827; color: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .i18n-edit-overlay { position: fixed; z-index: 999999; background: #fff; border: 1px solid #ddd; box-shadow: 0 6px 18px rgba(0,0,0,0.12); padding: 12px; border-radius: 8px; min-width: 320px; max-width: 640px; }
    .i18n-edit-overlay h4 { margin: 0 0 8px 0; font-size: 13px; }
    .i18n-edit-overlay textarea { width: 100%; height: 100px; font-size: 13px; padding: 8px; box-sizing: border-box; }
    .i18n-edit-overlay .row { margin-bottom: 8px; font-size: 13px; }
    .i18n-badge { font-size: 11px; color: #fff; background: #6b7280; padding: 2px 6px; border-radius: 6px; margin-left: 8px; }
    .i18n-candidate { font-size: 12px; padding: 6px; border-radius: 6px; cursor: pointer; display: inline-block; border: 1px solid #eee; margin-right: 6px; }
    .i18n-candidate.active { border-color: #2563eb; background: #eef2ff; }
  `;
  document.head.appendChild(styleElement);
}

function createButton(text, onClick) {
  const button = document.createElement('div');
  button.className = `btn`;
  button.textContent = text;
  button.onclick = onClick;
  return button;
}

function createSelect(options, selectedValue, onChange) {
  const select = document.createElement('select');
  select.className = 'select';

  options.forEach((option) => {
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
  uiRoot.className = WRAPPER_CLASS;

  const toggleButton = createButton('切换i18n编辑模式(OFF)', (e) => {
    isEditModeActive = !isEditModeActive;
    if (isEditModeActive) {
      e.target.textContent = '切换i18n编辑模式(ON)';
      activateEditMode();
    } else {
      e.target.textContent = '切换i18n编辑模式(OFF)';
      deactivateEditMode();
    }
  });

  const exportButton = createButton('导出修改数据', () => {
    downloadFile(`i18n.db.json`, JSON.stringify(i18nDB, null, 2));
  });

  const clearButton = createButton('重置修改', () => {
    if (confirm('确定要清空所有修改记录吗，确认后将刷新页面？')) window.location.reload();
  });

  // 语言切换下拉框
  const label = document.createElement('label');
  label.textContent = '请选择当前页面显示的语言: ';

  const langOptions = Object.keys(reverseMap).map((item) => ({ value: item, text: item }));
  const select = createSelect(langOptions, langOptions[0].value, function (event) {
    switchLanguage(event.target.value);
  });

  // 添加到页面
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
  let selectedKey = keys[0];

  const editorOverlay = createEditorOverlay(targetElement, keys, selectedKey, normalizedText, originalText);
  document.body.appendChild(editorOverlay);
  positionEditorOverlay(editorOverlay, targetElement);
  currentEditor = editorOverlay;
}

function createEditorOverlay(targetElement, keys, selectedKey, normalizedText, originalText) {
  const overlay = document.createElement('div');
  overlay.className = 'i18n-edit-overlay';
  overlay.setAttribute('role', 'dialog');

  const title = document.createElement('h4');
  title.innerHTML = `编辑翻译 <span class="i18n-badge">${targetLang}</span>`;
  overlay.appendChild(title);

  if (keys.length > 1) overlay.appendChild(createKeySelectionRow(keys, selectedKey, overlay));
  // overlay.appendChild(createInfoRow('源键:', selectedKey));
  overlay.appendChild(createInfoRow('当前渲染文本:', originalText));
  overlay.appendChild(createInfoRow(`${i18nDB.source_lang}:`, i18nDB.entries[selectedKey]?.[i18nDB.source_lang] || ''));
  overlay.appendChild(createTextareaRow(selectedKey));
  overlay.appendChild(createButtonRow(targetElement, selectedKey, overlay));

  return overlay;
}

function createKeySelectionRow(keys, selectedKey, overlay) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = '<div style="margin-bottom:6px;font-size:12px;color:#374151">候选键:</div>';
  keys.forEach((key) => {
    const keyElement = document.createElement('span');
    keyElement.className = `i18n-candidate ${key === selectedKey ? 'active' : ''}`;
    keyElement.textContent = key;
    keyElement.onclick = () => {
      overlay.querySelectorAll('.i18n-candidate').forEach((el) => el.classList.remove('active'));
      keyElement.classList.add('active');
      overlay.querySelector('textarea').value = i18nDB.entries[key]?.[targetLang] || '';
      selectedKey = key;
      overlay._selectedKey = key;
    };
    row.appendChild(keyElement);
  });
  return row;
}

function createInfoRow(label, value) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<strong>${label}</strong> <span style="color:#111">${value}</span>`;
  return row;
}

function createTextareaRow(selectedKey) {
  const row = document.createElement('div');
  row.className = 'row';
  const textarea = document.createElement('textarea');
  textarea.value = i18nDB.entries[selectedKey]?.[targetLang] || '';
  textarea.placeholder = `编辑 ${targetLang} 翻译`;
  row.appendChild(textarea);
  return row;
}

function createButtonRow(targetElement, selectedKey, overlay) {
  const row = document.createElement('div');
  row.style.textAlign = 'right';

  const saveButton = document.createElement('button');
  saveButton.textContent = '保存';
  saveButton.style.marginRight = '8px';
  saveButton.onclick = () => handleSave(targetElement, selectedKey, overlay);

  const cancelButton = document.createElement('button');
  cancelButton.textContent = '取消';
  cancelButton.onclick = closeEditor;

  row.appendChild(saveButton);
  row.appendChild(cancelButton);
  return row;
}

function handleSave(targetElement, selectedKey, overlay) {
  const keyToSave = overlay._selectedKey || selectedKey; // ✅ 优先用用户当前选中的键
  const textarea = overlay.querySelector('textarea');
  const newValue = textarea.value;
  const oldValue = i18nDB.entries[keyToSave]?.[targetLang] || '';

  if (newValue === oldValue) {
    alert('未检测到更改。');
    return;
  }

  if (!i18nDB.entries[selectedKey]) i18nDB.entries[selectedKey] = {};
  i18nDB.entries[selectedKey][targetLang] = newValue;
  i18nDB.entries[selectedKey].last_update = new Date().toISOString();

  // 更新 reverseMap
  if (!reverseMap[targetLang]) reverseMap[targetLang] = {};
  reverseMap[targetLang][newValue] = reverseMap[targetLang][oldValue] || [selectedKey];
  delete reverseMap[targetLang][oldValue];

  // 更新页面显示
  targetElement.textContent = newValue;
  // ✅ 在元素上标记已修改
  targetElement.dataset.i18nModified = 'true';

  closeEditor();
}

function positionEditorOverlay(overlay, targetElement) {
  const targetRect = targetElement.getBoundingClientRect();
  const overlayHeight = overlay.offsetHeight;
  const spaceAbove = targetRect.top;

  overlay.style.top = `${spaceAbove > overlayHeight + 20 ? targetRect.top - overlayHeight - 8 + window.scrollY : targetRect.bottom + 8 + window.scrollY}px`;
  overlay.style.left = `${Math.min(window.innerWidth - 360, targetRect.left + window.scrollX)}px`;
}

function closeEditor() {
  if (currentEditor?.parentNode) currentEditor.parentNode.removeChild(currentEditor);
  currentEditor = null;
}

// -------- 全局事件 --------
function handleEditableSpanClick(event) {
  const span = event.target.closest(`span[${HIGHLIGHT_ATTR}]`);
  if (!span) return;

  // ✅ 阻止默认行为（防止链接跳转、按钮触发）
  event.preventDefault();

  // ✅ 阻止事件冒泡（防止父级 click 被触发）
  event.stopPropagation();

  openEditorForElement(span);
}

// -------- 主模式切换 --------
function activateEditMode() {
  injectEditorStyles();
  createControlPanel();
  // markMatchedTextNodes();

  // 先初始化一遍
  removeAllMarkers();
  markMatchedTextNodes();
  document.querySelectorAll(`span[${HIGHLIGHT_ATTR}]`).forEach((span) => {
    span.addEventListener('click', handleEditableSpanClick);
  });

  // ✅ 启动 MutationObserver，监听 DOM 变化
  if (!mutationObserver) {
    let updateTimer = null;
    mutationObserver = new MutationObserver((mutations) => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        const addedNodes = [];
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((n) => addedNodes.push(n));
          }
        }
        if (addedNodes.length === 0) return;

        addedNodes.forEach((node) => {
          markTextNodesWithin(node);
        });

        document.querySelectorAll(`span[${HIGHLIGHT_ATTR}]`).forEach((span) => {
          if (!span._i18nClickBound) {
            span.addEventListener('click', handleEditableSpanClick);
            span._i18nClickBound = true;
          }
        });

        console.log('[i18n-editor] 检测到 DOM 变化，已为新增内容添加 i18n 编辑标记。');
      }, 300); // 防抖
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  console.log('[i18n-editor] 编辑模式已启用。监听 DOM 变化中...');
}

function deactivateEditMode() {
  closeEditor();
  document.querySelectorAll(`span[${HIGHLIGHT_ATTR}]`).forEach((span) => {
    span.removeEventListener('click', handleEditableSpanClick);
  });
  removeAllMarkers();
  //   alert('i18n编辑模式已停用。')

  // ✅ 停止观察 DOM
  clearTimeout(updateTimer);
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  console.log('[i18n-editor] 编辑模式已停用。');
}

// -------- 语言切换 --------
function switchLanguage(lang) {
  if (targetLang === lang) return;
  targetLang = lang;
  if (isEditModeActive) {
    removeAllMarkers();
    markMatchedTextNodes();
    document.querySelectorAll(`span[${HIGHLIGHT_ATTR}]`).forEach((span) => {
      span.addEventListener('click', handleEditableSpanClick);
    });
  }
}

// -------- 初始化 --------
injectEditorStyles();
createControlPanel();
console.log('[i18n-editor] 就绪。使用右下角的"切换i18n编辑模式"按钮开始编辑。');
