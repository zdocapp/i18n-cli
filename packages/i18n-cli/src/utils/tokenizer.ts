/**
 * 粗略 token 估算工具(参考 DeepSeek 的估算方法)
 * 英文字符 ≈ 0.3 token
 * 中文字符 ≈ 0.6 token
 */
export function estimateTokens(text: string | any[]): number {
  const content = typeof text === 'string' ? text : JSON.stringify(text);

  let count = 0;
  for (const char of content) {
    if (/[\u4e00-\u9fff]/.test(char)) {
      count += 0.6; // 中文
    } else {
      count += 0.3; // 英文或其他
    }
  }
  return Math.ceil(count);
}
