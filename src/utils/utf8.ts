// string -> UTF-8 bytes without relying on TextEncoder.
export function stringToUtf8Bytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return new Uint8Array(bytes);
}

// UTF-8 bytes -> string without relying on TextDecoder, which Expo polyfilled but bare
// React Native (Hermes) does not provide.
export function utf8BytesToString(bytes: Uint8Array): string {
  const CHUNK = 8192;
  const codeUnits: number[] = [];
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    let cp: number;
    if (b0 < 0x80) {
      cp = b0;
    } else if (b0 < 0xe0) {
      cp = ((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f);
    } else if (b0 < 0xf0) {
      cp = ((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    } else {
      cp = ((b0 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    }
    if (cp > 0xffff) {
      cp -= 0x10000;
      codeUnits.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      codeUnits.push(cp);
    }
    if (codeUnits.length >= CHUNK) {
      out += String.fromCharCode(...codeUnits);
      codeUnits.length = 0;
    }
  }
  return out + String.fromCharCode(...codeUnits);
}
