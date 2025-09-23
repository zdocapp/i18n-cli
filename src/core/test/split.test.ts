import { describe, it, expect } from 'vitest';
import { chunkByTokens } from '../chunk.js';
import { estimateTokens } from '../../utils/tokenizer.js';

describe.only('chunkByTokens', () => {
  it('可以正确拆分', () => {
    const entries = {
      key1: '1'.repeat(4000),
      key2: '2'.repeat(2000),
    };

    const result = chunkByTokens(entries, 1000);

    for (const [index, batch] of result.entries()) {
      let total = 0;
      let estimatedTokens = 0;
      for (const key in batch) {
        total += (batch[key] as string).length;
        estimatedTokens = estimateTokens(batch[key]);
      }
      console.log(
        `Batch ${index + 1}:`,
        Object.keys(batch),
        'Total Length:',
        total,
        'Estimated Tokens:',
        estimatedTokens,
      );
    }

    expect(result.length).toBe(2);
  });
});
