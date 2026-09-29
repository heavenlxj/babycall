const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** ASCII 字符串 base64 编码（小程序环境无 btoa） */
export function base64(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = input.charCodeAt(i + 1);
    const c = input.charCodeAt(i + 2);
    const n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += CHARS[(n >> 18) & 63] + CHARS[(n >> 12) & 63];
    out += isNaN(b) ? '=' : CHARS[(n >> 6) & 63];
    out += isNaN(c) ? '=' : CHARS[n & 63];
  }
  return out;
}
