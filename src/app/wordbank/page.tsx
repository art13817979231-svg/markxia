"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WordBankSelector } from "@/components/WordBankSelector";
import type { TypingWord } from "@/data/mockWords";
import { sanitizeTypingWords } from "@/lib/wordbank";

export default function WordBankPage() {
  const router = useRouter();

  function handleWordsChange(words: TypingWord[]) {
    const sanitized = sanitizeTypingWords(words);
    localStorage.setItem("typing_words", JSON.stringify(sanitized));
    router.push("/");
  }

  return (
    <main
      className="min-h-screen px-4 py-12 md:px-10 max-w-2xl mx-auto transition-colors duration-300"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-main)" }}
    >
      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/"
          className="rounded-lg px-3 py-1.5 text-xs transition hover:opacity-70"
          style={{ color: "var(--color-text-sub)" }}
        >
          ← 返回练习
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-main)" }}>
        词库管理
      </h1>
      <WordBankSelector onChange={handleWordsChange} />
    </main>
  );
}
