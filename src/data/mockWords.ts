export type TypingWord = {
  id: string;
  word: string;
  phonetic: string;
  chinese: string;
};

export const mockWords: TypingWord[] = [
  { id: "1", word: "resilient", phonetic: "/rɪˈzɪliənt/", chinese: "有韧性的" },
  { id: "2", word: "abundant", phonetic: "/əˈbʌndənt/", chinese: "丰富的" },
  { id: "3", word: "subtle", phonetic: "/ˈsʌtəl/", chinese: "微妙的" },
  { id: "4", word: "foster", phonetic: "/ˈfɒstər/", chinese: "培养，促进" },
  { id: "5", word: "coherent", phonetic: "/koʊˈhɪrənt/", chinese: "连贯的" }
];
