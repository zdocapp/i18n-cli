import { createHash } from 'crypto';

export function getHash(text: string | any[] = ''): string {
  if (typeof text === 'string') {
    return createHash('sha256').update(text).digest('hex');
  }

  return createHash('sha256').update(JSON.stringify(text)).digest('hex');
}
