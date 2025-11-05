import { estimateTokens } from '../utils/tokenizer.js';
import { MessageRecord } from '../types/i18n.js';

/**
 * 按 token 限制将翻译条目分组
 */
export function chunkByTokens(entries: MessageRecord, tokenLimit: number = 1000): MessageRecord[] {
  const batches: MessageRecord[] = [];
  let currentBatch: MessageRecord = {};
  let currentTokens = 0;

  for (const key in entries) {
    const value = entries[key];
    const tokenCount = estimateTokens(value);

    if (currentTokens + tokenCount > tokenLimit && Object.keys(currentBatch).length > 0) {
      batches.push(currentBatch);
      currentBatch = {};
      currentTokens = 0;
    }

    currentBatch[key] = value;
    currentTokens += tokenCount;
  }

  if (Object.keys(currentBatch).length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
