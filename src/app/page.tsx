"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Palette } from "lucide-react";
import { TypingInterface } from "@/components/TypingInterface";
import { ThemeSelector } from "@/components/ThemeSelector";
import { mockWords } from "@/data/mockWords";
import type { TypingWord } from "@/data/mockWords";
import { supabase } from "@/lib/supabase";
import { sanitizeTypingWords } from "@/lib/wordbank";

export default function HomePage() {
  const [words, setWords] = useState<TypingWord[]>(mockWords);
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("typing_words");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TypingWord[];
        const sanitized = sanitizeTypingWords(parsed);
        if (sanitized.length) {
          setWords(sanitized);
          if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
            localStorage.setItem("typing_words", JSON.stringify(sanitized));
          }
        } else {
          localStorage.removeItem("typing_words");
        }
      } catch {}
    }
  }, []);

  return (
    <main
      className="min-h-screen px-4 py-8 transition-colors duration-300 md:px-10"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-end gap-3">
        <button
          onClick={() => setShowThemes(true)}
          className="rounded-lg px-3 py-1.5 text-xs transition hover:opacity-70"
          style={{ color: "var(--color-text-sub)" }}
        >
          <Palette size={14} className="inline mr-1" />
          主题
        </button>
        <button
          onClick={() => { localStorage.removeItem("typing_words"); window.location.reload(); }}
          className="rounded-lg px-3 py-1.5 text-xs transition hover:opacity-70"
          style={{ color: "var(--color-text-sub)" }}
          title="清除自定义词库，恢复默认英文示例词"
        >
          重置词库
        </button>
        <Link
          href="/wordbank"
          className="rounded-lg px-3 py-1.5 text-xs transition hover:opacity-70"
          style={{ color: "var(--color-text-sub)" }}
        >
          词库管理 →
        </Link>
      </div>
      <TypingInterface
        words={words}
        onMistake={async (word, input) => {
          if (!supabase) return;
          await supabase.from("mistake_collection").insert({
            word_id: word.id,
            expected: word.word,
            actual: input,
            mode: "session",
          });
        }}
      />
      {showThemes && <ThemeSelector onClose={() => setShowThemes(false)} />}
    </main>
  );
}
