export type TypingWord = {
  id: string;
  word: string;
  phonetic: string;
  chinese: string;
  sentence?: string;
  sentenceZh?: string;
  paragraph?: string;
  paragraphZh?: string;
};

export const mockWords: TypingWord[] = [
  {
    id: "1",
    word: "apple",
    phonetic: "/ˈaepl/",
    chinese: "苹果",
    sentence: "I eat an apple every morning.",
    sentenceZh: "我每天早上吃一个苹果。",
    paragraph:
      "Healthy habits start with small choices. I eat an apple every morning and keep a simple routine to stay focused.",
    paragraphZh: "健康习惯始于微小选择。我每天早上吃一个苹果，并保持简单规律来保持专注。",
  },
  {
    id: "2",
    word: "success",
    phonetic: "/səkˈses/",
    chinese: "成功",
    sentence: "Success comes from daily effort.",
    sentenceZh: "成功来自每天的努力。",
  },
  {
    id: "3",
    word: "challenge",
    phonetic: "/ˈtʃaelɪndʒ/",
    chinese: "挑战",
    sentence: "I treat every mistake as a challenge.",
    sentenceZh: "我把每个错误都当作挑战。",
  },
  { id: "4", word: "keyboard", phonetic: "/ˈkiːbɔːrd/", chinese: "键盘" },
  { id: "5", word: "language", phonetic: "/ˈlaeŋɡwɪdʒ/", chinese: "语言" },
];
