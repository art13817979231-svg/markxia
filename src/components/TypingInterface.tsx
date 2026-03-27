"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Headphones, Keyboard, WandSparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { TypingWord } from "@/data/mockWords";

export type Mode = "practice" | "test";

type TypingInterfaceProps = {
  words: TypingWord[];
  onMistake?: (word: TypingWord, input: string) => Promise<void> | void;
};

function pronounce(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function TypingInterface({ words, onMistake }: TypingInterfaceProps) {
  const [mode, setMode] = useState<Mode>("practice");
  const [cursor, setCursor] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");

  const currentWord = words[cursor % words.length];

  const meta = useMemo(() => {
    const done = cursor;
    return {
      done,
      progress: Math.min((done / words.length) * 100, 100),
    };
  }, [cursor, words.length]);

  const submit = async () => {
    if (!inputValue.trim()) return;

    const normalized = inputValue.trim().toLowerCase();
    const target = currentWord.word.toLowerCase();

    if (normalized === target) {
      setFeedback("correct");
      pronounce(currentWord.word);
      setTimeout(() => {
        setCursor((v) => v + 1);
        setInputValue("");
        setFeedback("idle");
      }, 220);
      return;
    }

    setFeedback("wrong");
    await onMistake?.(currentWord, normalized);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit();
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">TypeLex Minimal</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Typing & Vocabulary</h1>
        </div>
        <div className="inline-flex rounded-xl border border-zinc-200 p-1 text-sm">
          <button
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === "practice" ? "bg-zinc-900 text-white" : "text-zinc-500"
            }`}
            onClick={() => setMode("practice")}
            type="button"
          >
            <span className="inline-flex items-center gap-2"><Keyboard size={14} /> Practice</span>
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === "test" ? "bg-zinc-900 text-white" : "text-zinc-500"
            }`}
            onClick={() => setMode("test")}
            type="button"
          >
            <span className="inline-flex items-center gap-2"><WandSparkles size={14} /> Test</span>
          </button>
        </div>
      </header>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span>Session Progress</span>
          <span>{meta.done}/{words.length}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <motion.div
            className="h-full rounded-full bg-zinc-900"
            animate={{ width: `${meta.progress}%` }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentWord.id + mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-4"
        >
          <p className="text-sm text-zinc-400">{currentWord.phonetic}</p>
          <h2
            className={`text-4xl font-semibold tracking-wide transition-colors ${
              feedback === "correct"
                ? "text-zinc-900"
                : feedback === "wrong"
                  ? "text-red-500"
                  : "text-zinc-700"
            }`}
          >
            {mode === "practice" ? currentWord.word : "••••••"}
          </h2>
          <p className="text-base text-zinc-500">{currentWord.chinese}</p>

          <button
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50"
            onClick={() => pronounce(currentWord.word)}
            type="button"
          >
            <Headphones size={14} /> Play Pronunciation
          </button>
        </motion.div>
      </AnimatePresence>

      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-lg outline-none transition focus:border-zinc-400 focus:bg-white"
          onChange={(event) => {
            if (feedback === "wrong") setFeedback("idle");
            setInputValue(event.target.value);
          }}
          onKeyDown={async (event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              await submit();
            }
          }}
          placeholder="Type and press Space / Enter"
          spellCheck={false}
          value={inputValue}
        />
      </form>

      <p className="text-xs text-zinc-400">
        Incorrect entries are queued for Ebbinghaus-based review and synced to Supabase.
      </p>
    </section>
  );
}
