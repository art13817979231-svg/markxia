import type { TypingWord } from "@/data/mockWords";

function hasEnglishText(text?: string) {
  if (!text) return false;
  return /[a-zA-Z]/.test(text);
}

// 含有 CJK 汉字的字段不应出现在 word 列（英文单词列）中。
function hasCjkChar(text?: string): boolean {
  if (!text) return false;
  return /[\u3000-\u9fff\uf900-\ufaff]/.test(text);
}

function normalizeValue(value?: string) {
  return (value || "").trim();
}

export function sanitizeTypingWords(input: TypingWord[]): TypingWord[] {
  const result: TypingWord[] = [];

  for (const row of input) {
    const rawWord = normalizeValue(row.word);
    const rawChinese = normalizeValue(row.chinese);

    let word = rawWord;
    let chinese = rawChinese;

    // 兼容用户把 word/chinese 列贴反的情况。
    if (!hasEnglishText(word) && hasEnglishText(chinese)) {
      word = chinese;
      chinese = rawWord;
    }

    // word 列必须含英文且不含汉字，否则直接丢弃。
    if (!hasEnglishText(word) || hasCjkChar(word)) continue;

    const sentence = normalizeValue(row.sentence);
    const sentenceZh = normalizeValue(row.sentenceZh);
    const paragraph = normalizeValue(row.paragraph);
    const paragraphZh = normalizeValue(row.paragraphZh);

    result.push({
      id: normalizeValue(row.id) || String(result.length + 1),
      word,
      phonetic: normalizeValue(row.phonetic),
      chinese,
      sentence: hasEnglishText(sentence) ? sentence : undefined,
      sentenceZh: sentenceZh || undefined,
      paragraph: hasEnglishText(paragraph) ? paragraph : undefined,
      paragraphZh: paragraphZh || undefined,
    });
  }

  return result;
}
