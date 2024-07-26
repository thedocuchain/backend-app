export function isCyrillic(text: string): boolean {
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text);
}
