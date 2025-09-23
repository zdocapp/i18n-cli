export interface KeyMap {
  [compressed: string]: string; // "1" -> "title.buy"
}

/**
 * 将对象的 key 压缩为递增数字字符串
 */
export function compressKeys<T extends Record<string, any>>(
  data: T,
): {
  compressedMessages: Record<string, any>;
  keyMap: KeyMap;
} {
  const compressedMessages: Record<string, any> = {};
  const keyMap: KeyMap = {};

  let i = 1;
  for (const key in data) {
    const compressedKey = String(i++);
    compressedMessages[compressedKey] = data[key];
    keyMap[compressedKey] = key;
  }

  return { compressedMessages, keyMap };
}

/**
 * 使用映射表还原 key
 */
export function restoreKeys<T extends Record<string, any>>(data: T, keyMap: KeyMap): Record<string, any> {
  const restored: Record<string, any> = {};

  for (const compressedKey in data) {
    const originalKey = keyMap[compressedKey];
    if (originalKey) {
      restored[originalKey] = data[compressedKey];
    } else {
      // 如果没有对应映射，保留原始 key
      restored[compressedKey] = data[compressedKey];
    }
  }

  return restored;
}
