import { describe, it, expect } from 'vitest';
import { compressKeys, restoreKeys } from '../compressKeys.js';

describe('compressKeys & restoreKeys', () => {
  it('should compress object keys to incremental numbers', () => {
    const messages = {
      'title.buy': 'Buy Crypto',
      'title.order': 'Choose Payment Method',
    };

    const { compressedMessages, keyMap } = compressKeys(messages);

    expect(compressedMessages).toEqual({
      '1': 'Buy Crypto',
      '2': 'Choose Payment Method',
    });

    expect(keyMap).toEqual({
      '1': 'title.buy',
      '2': 'title.order',
    });
  });

  it('should restore keys using keyMap', () => {
    const translated = {
      '1': '购买加密货币',
      '2': '选择支付方式',
    };

    const keyMap = {
      '1': 'title.buy',
      '2': 'title.order',
    };

    const restored = restoreKeys(translated, keyMap);

    expect(restored).toEqual({
      'title.buy': '购买加密货币',
      'title.order': '选择支付方式',
    });
  });

  it('should keep unknown keys when restoring', () => {
    const translated = {
      '1': '购买加密货币',
      '999': '未知',
    };

    const keyMap = {
      '1': 'title.buy',
    };

    const restored = restoreKeys(translated, keyMap);

    expect(restored).toEqual({
      'title.buy': '购买加密货币',
      '999': '未知', // 没有映射的 key 保留原样
    });
  });

  it('should handle empty input gracefully', () => {
    const { compressedMessages, keyMap } = compressKeys({});
    expect(compressedMessages).toEqual({});
    expect(keyMap).toEqual({});

    const restored = restoreKeys({}, {});
    expect(restored).toEqual({});
  });
});
