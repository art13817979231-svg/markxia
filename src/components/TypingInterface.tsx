"use client";

import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { mockWords, type TypingWord } from "@/data/mockWords";

type PracticeItem = {
  id: string;
  text: string;
  phonetic?: string;
  translation: string;
};

type TypingInterfaceProps = {
  words: TypingWord[];
  onMistake?: (word: TypingWord, input: string) => Promise<void> | void;
};

type SpeechStatus = "checking" | "ready" | "error";
type SpeechEngine = "server" | "browser" | "beep";
type PracticeMode = "word" | "sentence";

type MistakeWord = {
  key: string;
  mode: PracticeMode;
  id: string;
  word: string;
  phonetic: string;
  chinese: string;
  addedAt: string;
  wrongCount: number;
  lastSeenAt: string;
};

function normalizeText(input: string) {
  return input.trim().toLowerCase();
}

function normalizeForCompare(input: string) {
  const base = normalizeText(input);

  // 忽略标点并折叠多余空格，降低非关键格式差异带来的误判。
  return base
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?！，。；：、“”‘’（）【】《》…—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasEnglishText(text?: string) {
  if (!text) return false;
  return /[a-zA-Z]/.test(text);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const shakeAnimation = {
  x: [0, -6, 6, -4, 4, -2, 2, 0],
  transition: { duration: 0.4 },
};

const PRONOUNCE_TIMEOUT_MS = 4500;
const CORRECT_NEXT_DELAY_MS = 0;
const SPEECH_RATE = 1.25;
const SECOND_READ_GAP_MS = 120;
const WRONG_RETRY_DELAY_MS = 500;
const MISTAKE_COLLECTION_KEY = "mistake_words";

export function TypingInterface({ words, onMistake }: TypingInterfaceProps) {
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("word");
  const [wordIndex, setWordIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [shakeKey, setShakeKey] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("checking");
  const [, setSpeechError] = useState("");
  const [speechEngine, setSpeechEngine] = useState<SpeechEngine>("server");
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [pendingAutoReplay, setPendingAutoReplay] = useState(false);
  const [mistakeRecords, setMistakeRecords] = useState<Record<string, MistakeWord>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesLoadedRef = useRef(false);
  const playSequenceRef = useRef(0);
  const lastAutoReadKeyRef = useRef("");
  const autoNextTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 服务端 TTS 不依赖浏览器 voices，页面加载后即可进入可播放状态。
    setSpeechStatus("ready");
    setSpeechEngine("server");

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      selectedVoiceRef.current = voices.find((voice) => voice.lang.startsWith("en-")) || voices[0];
      voicesLoadedRef.current = true;
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current !== null) {
        window.clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(MISTAKE_COLLECTION_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Array<Partial<MistakeWord>>;
      const normalized: Record<string, MistakeWord> = {};

      for (const item of parsed) {
        const id = typeof item?.id === "string" ? item.id : "";
        if (!id) continue;

        const mode: PracticeMode = item?.mode === "sentence" ? "sentence" : "word";
        const key = typeof item?.key === "string" && item.key ? item.key : `${mode}:${id}`;
        const addedAt = typeof item?.addedAt === "string" ? item.addedAt : new Date().toISOString();

        normalized[key] = {
          key,
          mode,
          id,
          word: typeof item?.word === "string" ? item.word : "",
          phonetic: typeof item?.phonetic === "string" ? item.phonetic : "",
          chinese: typeof item?.chinese === "string" ? item.chinese : "",
          addedAt,
          wrongCount: typeof item?.wrongCount === "number" && item.wrongCount > 0 ? item.wrongCount : 1,
          lastSeenAt: typeof item?.lastSeenAt === "string" ? item.lastSeenAt : addedAt,
        };
      }

      setMistakeRecords(normalized);
    } catch {
      setMistakeRecords({});
    }
  }, []);

  const wordItems = useMemo<PracticeItem[]>(() => {
    const fromWords = words
      .filter((word) => hasEnglishText(word.word))
      .map((word) => ({
        id: word.id,
        text: word.word,
        phonetic: word.phonetic,
        translation: word.chinese,
      }));

    if (fromWords.length > 0) return fromWords;

    return mockWords.map((word) => ({
      id: word.id,
      text: word.word,
      phonetic: word.phonetic,
      translation: word.chinese,
    }));
  }, [words]);

  const sentenceItems = useMemo<PracticeItem[]>(() => {
    const fromWords = words
      .filter((word) => hasEnglishText(word.sentence) && word.sentenceZh)
      .map((word) => ({
        id: word.id,
        text: word.sentence!.trim(),
        phonetic: "",
        translation: word.sentenceZh!.trim(),
      }));

    if (fromWords.length > 0) return fromWords;

    return mockWords
      .filter((word) => hasEnglishText(word.sentence) && word.sentenceZh)
      .map((word) => ({
        id: word.id,
        text: word.sentence!.trim(),
        phonetic: "",
        translation: word.sentenceZh!.trim(),
      }));
  }, [words]);

  const baseItems = practiceMode === "word" ? wordItems : sentenceItems;
  const items = baseItems;

  const currentWord = items.length ? items[wordIndex % items.length] : null;
  const currentMistakeKey = currentWord ? `${practiceMode}:${currentWord.id}` : "";
  const progress = useMemo(() => {
    if (!items.length) return 0;
    const activeKeys = new Set(items.map((item) => `${practiceMode}:${item.id}`));
    let modeCompleted = 0;
    for (const key of completed) {
      if (activeKeys.has(key)) modeCompleted += 1;
    }
    return Math.min((modeCompleted / items.length) * 100, 100);
  }, [completed, items, practiceMode]);

  useEffect(() => {
    if (hasSubmitted) return;
    inputRef.current?.focus();
  }, [hasSubmitted, wordIndex]);

  function playBeep() {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  function enableSpeech() {
    if (typeof window === "undefined") return false;
    setSpeechError("");
    setSpeechStatus("ready");
    if (speechEngine === "beep") setSpeechEngine("server");
    return true;
  }

  function stopSpeechPlayback() {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    }
  }

  function playWebSpeech(text: string) {
    return new Promise<boolean>((resolve) => {
      if (typeof window === "undefined" || !text.trim()) {
        resolve(false);
        return;
      }

      try {
        const synth = window.speechSynthesis;
        if (!voicesLoadedRef.current) {
          const voices = synth.getVoices();
          if (voices.length > 0) {
            selectedVoiceRef.current = voices.find((voice) => voice.lang.startsWith("en-")) || voices[0];
            voicesLoadedRef.current = true;
          }
        }

        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
          utterance.lang = selectedVoiceRef.current.lang;
        } else {
          utterance.lang = "en-US";
        }

        utterance.rate = SPEECH_RATE;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          setSpeechEngine("browser");
          setSpeechStatus("ready");
          setSpeechError("");
        };

        utterance.onend = () => resolve(true);
        utterance.onerror = (event) => {
          if (event.error === "interrupted" || event.error === "canceled") {
            resolve(false);
            return;
          }

          if (event.error === "not-allowed") {
            // 浏览器拦截自动播放时，等待用户首次交互后自动补播。
            setPendingAutoReplay(true);
            setSpeechStatus("ready");
            setSpeechError("浏览器拦截了自动播放，点击页面或输入后将自动补播。");
            resolve(false);
            return;
          }

          setSpeechStatus("error");
          setSpeechError("语音合成失败，请重试。");
          resolve(false);
        };

        synth.speak(utterance);
      } catch {
        setSpeechStatus("error");
        setSpeechError("语音调用异常，请重试。");
        resolve(false);
      }
    });
  }

  function playServerTts(text: string) {
    return new Promise<boolean>((resolve) => {
      if (typeof window === "undefined" || !text.trim()) {
        resolve(false);
        return;
      }

      try {
        const audio = audioRef.current || new Audio();
        audioRef.current = audio;
        audio.preload = "auto";
        audio.playbackRate = SPEECH_RATE;
        (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;

        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        audio.src = `/api/tts?text=${encodeURIComponent(text.slice(0, 180))}`;
        audio.currentTime = 0;

        audio.onended = () => {
          setSpeechEngine("server");
          setSpeechStatus("ready");
          setSpeechError("");
          resolve(true);
        };

        audio.onerror = async () => {
          const ok = await playWebSpeech(text);
          resolve(ok);
        };

        const playPromise = audio.play();
        if (!playPromise) {
          resolve(true);
          return;
        }

        playPromise.catch(async () => {
          const ok = await playWebSpeech(text);
          resolve(ok);
        });
      } catch {
        playWebSpeech(text).then(resolve);
      }
    });
  }

  async function pronounce(text: string) {
    if (!text.trim()) return false;
    if (typeof window === "undefined") return false;

    if (speechStatus !== "ready") {
      const ok = enableSpeech();
      if (!ok) return false;
    }

    if (speechEngine === "beep") {
      playBeep();
      return false;
    }

    const browserOk = await playWebSpeech(text);
    if (browserOk) return true;

    return playServerTts(text);
  }

  async function pronounceWithTimeout(text: string) {
    return Promise.race<boolean>([
      pronounce(text),
      wait(PRONOUNCE_TIMEOUT_MS).then(() => false),
    ]);
  }

  useEffect(() => {
    if (!currentWord) return;
    if (speechStatus !== "ready") return;
    if (speechEngine === "beep") return;
    if (hasSubmitted) return;

    const key = `${currentWord.id}-${wordIndex}`;
    if (lastAutoReadKeyRef.current === key) return;
    lastAutoReadKeyRef.current = key;

    const playToken = ++playSequenceRef.current;

    void (async () => {
      let successCount = 0;

      if (playSequenceRef.current !== playToken) return;
      const firstOk = await pronounceWithTimeout(currentWord.text);
      if (firstOk) successCount += 1;

      if (playSequenceRef.current !== playToken) return;
      await wait(SECOND_READ_GAP_MS);
      if (playSequenceRef.current !== playToken) return;
      const secondOk = await pronounceWithTimeout(currentWord.text);
      if (secondOk) successCount += 1;

      if (successCount < 2) setPendingAutoReplay(true);
    })();

    return () => {
      playSequenceRef.current += 1;
    };
    // 自动朗读流程只应在题目切换和语音状态变化时重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, hasSubmitted, speechEngine, speechStatus, wordIndex]);

  useEffect(() => {
    if (!pendingAutoReplay) return;
    if (!currentWord || hasSubmitted) return;

    const handleFirstInteraction = () => {
      setPendingAutoReplay(false);
      setSpeechStatus("ready");
      setSpeechError("");
      const playToken = ++playSequenceRef.current;

      void (async () => {
        let successCount = 0;

        await wait(60);
        if (playSequenceRef.current !== playToken) return;
        const firstOk = await pronounceWithTimeout(currentWord.text);
        if (firstOk) successCount += 1;

        if (playSequenceRef.current !== playToken) return;
        await wait(260);
        if (playSequenceRef.current !== playToken) return;
        const secondOk = await pronounceWithTimeout(currentWord.text);
        if (secondOk) successCount += 1;

        if (successCount < 2) {
          setSpeechStatus("ready");
          setSpeechError("自动双次发音未完整播放，将在下一题继续自动尝试。");
        }
      })();
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    // 这里依赖当前题面与补播开关，避免每次 render 重新绑定一次性监听器。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, hasSubmitted, pendingAutoReplay]);

  async function submit() {
    if (!currentWord || hasSubmitted) return;

    const trimmed = inputValue.trim();
    const isCorrect = trimmed
      ? normalizeForCompare(trimmed) === normalizeForCompare(currentWord.text)
      : null;
    setHasSubmitted(true);
    if (isCorrect === true) {
      setFeedback("correct");
      setCompleted((prev) => new Set(prev).add(`${practiceMode}:${currentWord.id}`));
    } else if (isCorrect === false) {
      setFeedback("wrong");
    } else {
      setFeedback("idle");
    }

    if (isCorrect === true) {
      // 用户答对后立即切题，不再等待本题剩余语音播放。
      playSequenceRef.current += 1;
      setPendingAutoReplay(false);
      setSpeechStatus("ready");
      setSpeechError("");
      stopSpeechPlayback();

      if (autoNextTimerRef.current !== null) {
        window.clearTimeout(autoNextTimerRef.current);
      }
      autoNextTimerRef.current = window.setTimeout(() => {
        nextQuestion();
      }, CORRECT_NEXT_DELAY_MS);
      return;
    }

    if (isCorrect === false) {
      setShakeKey((value) => value + 1);
      upsertMistakeRecord(currentWord, true);
      try {
        await onMistake?.(
          {
            id: currentWord.id,
            word: currentWord.text,
            phonetic: currentWord.phonetic || "",
            chinese: currentWord.translation,
          },
          trimmed,
        );
      } catch {
        // 上报失败不影响主流程。
      }
    }

    await pronounceWithTimeout(currentWord.text);

    clearAutoNextTimer();
    autoNextTimerRef.current = window.setTimeout(() => {
      // 答错时不跳题，重置当前题并重新触发自动双播。
      playSequenceRef.current += 1;
      resetQuestionState();
    }, WRONG_RETRY_DELAY_MS);
  }

  function clearAutoNextTimer() {
    if (autoNextTimerRef.current !== null) {
      window.clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  }

  function resetQuestionState() {
    setHasSubmitted(false);
    setFeedback("idle");
    setInputValue("");
    setIsReplayPlaying(false);
    setPendingAutoReplay(false);
    setSpeechStatus("ready");
    setSpeechError("");
    lastAutoReadKeyRef.current = "";
  }

  function prepareQuestionTransition() {
    playSequenceRef.current += 1;
    stopSpeechPlayback();
    clearAutoNextTimer();
    resetQuestionState();
  }

  function nextQuestion() {
    if (!items.length) return;
    prepareQuestionTransition();
    setWordIndex((value) => value + 1);
  }

  function updateMistakeRecords(updater: (prev: Record<string, MistakeWord>) => Record<string, MistakeWord>) {
    setMistakeRecords((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        localStorage.setItem(MISTAKE_COLLECTION_KEY, JSON.stringify(Object.values(next)));
      }
      return next;
    });
  }

  function upsertMistakeRecord(item: PracticeItem, incrementWrongCount: boolean) {
    const entryKey = `${practiceMode}:${item.id}`;
    const now = new Date().toISOString();

    updateMistakeRecords((prev) => {
      const existing = prev[entryKey];
      const baseWrongCount = existing?.wrongCount ?? 0;

      return {
        ...prev,
        [entryKey]: {
          key: entryKey,
          mode: practiceMode,
          id: item.id,
          word: item.text,
          phonetic: item.phonetic || "",
          chinese: item.translation,
          addedAt: existing?.addedAt || now,
          wrongCount: incrementWrongCount ? baseWrongCount + 1 : Math.max(baseWrongCount, 1),
          lastSeenAt: now,
        },
      };
    });
  }

  function addToMistakeCollection() {
    if (!currentWord || typeof window === "undefined") return;
    upsertMistakeRecord(currentWord, false);
  }

  function switchPracticeMode(mode: PracticeMode) {
    if (mode === practiceMode) return;

    prepareQuestionTransition();

    setPracticeMode(mode);
    setWordIndex(0);
  }

  async function replayCurrent() {
    if (!currentWord || isReplayPlaying) return;

    playSequenceRef.current += 1;
    setPendingAutoReplay(false);
    setSpeechStatus("ready");
    setSpeechError("");
    stopSpeechPlayback();

    setIsReplayPlaying(true);
    try {
      await pronounceWithTimeout(currentWord.text);
    } finally {
      setIsReplayPlaying(false);
    }
  }

  function prevQuestion() {
    if (!items.length) return;
    prepareQuestionTransition();
    setWordIndex((value) => (value - 1 + items.length) % items.length);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit();
  }

  if (!currentWord) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 py-8">
        <p style={{ color: "var(--color-text-sub)" }}>当前没有可练习的内容。</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 py-4">
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--color-text-sub)" }}>
          <span className="uppercase tracking-widest">TypeLex</span>
          <span className="tabular-nums">
            {Math.min(wordIndex + 1, items.length)} / {items.length}
          </span>
        </div>
        <div className="mb-3 flex items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => switchPracticeMode("word")}
            className="rounded-full px-3 py-1.5 transition hover:opacity-90"
            style={{
              backgroundColor: practiceMode === "word" ? "var(--color-accent)" : "transparent",
              color: practiceMode === "word" ? "var(--color-bg)" : "var(--color-text-sub)",
              border: "1px solid var(--color-text-sub)",
            }}
          >
            单词练习
          </button>
          <button
            type="button"
            onClick={() => switchPracticeMode("sentence")}
            disabled={!sentenceItems.length}
            className="rounded-full px-3 py-1.5 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: practiceMode === "sentence" ? "var(--color-accent)" : "transparent",
              color: practiceMode === "sentence" ? "var(--color-bg)" : "var(--color-text-sub)",
              border: "1px solid var(--color-text-sub)",
            }}
          >
            句子练习
          </button>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-text-sub)", opacity: 0.25 }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: progress >= 100 ? "#34d399" : "var(--color-accent)" }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
      </div>

      <motion.div
        key={currentWord.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex w-full flex-col items-center gap-4"
      >
        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: "var(--color-text-sub)", opacity: 0.7 }}>
          {practiceMode === "word" ? "中文提示" : "中文句子"}
        </p>

        <motion.h2
          key={shakeKey}
          animate={feedback === "wrong" ? shakeAnimation : {}}
          className="max-w-xl text-center text-3xl font-semibold leading-relaxed md:text-4xl"
          style={{
            color:
              feedback === "correct"
                ? "#34d399"
                : feedback === "wrong"
                  ? "#f87171"
                  : "var(--color-text-main)",
          }}
        >
          {hasSubmitted ? currentWord.text : currentWord.translation}
        </motion.h2>

        {practiceMode === "word" && currentWord.phonetic ? (
          <div className="flex items-center gap-2">
            <p className="font-typing text-lg" style={{ color: "var(--color-text-sub)", opacity: 0.68 }}>
              {currentWord.phonetic}
            </p>
            <button
              type="button"
              onClick={() => void replayCurrent()}
              disabled={isReplayPlaying}
              className="rounded-full border p-1.5 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--color-text-sub)", color: "var(--color-text-sub)" }}
              aria-label="重读"
              title="重读"
            >
              <Volume2 size={14} />
            </button>
          </div>
        ) : null}

        {hasSubmitted ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-sm"
              style={{
                backgroundColor: feedback === "correct" ? "rgba(52,211,153,0.16)" : "rgba(248,113,113,0.16)",
                color: feedback === "correct" ? "#34d399" : "#f87171",
              }}
            >
              {feedback === "correct" ? "正确" : feedback === "wrong" ? "错误" : "答案"}
            </span>
          </div>
        ) : null}
      </motion.div>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <input
          ref={inputRef}
          autoFocus
          disabled={hasSubmitted}
          className={`font-typing w-full rounded-xl border px-5 py-3.5 text-center text-xl outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${practiceMode === "word" ? "tracking-widest" : "tracking-normal"}`}
          style={{
            backgroundColor: "transparent",
            borderColor:
              feedback === "wrong"
                ? "#f87171"
                : feedback === "correct"
                  ? "#34d399"
                  : "var(--color-text-sub)",
            color: "var(--color-text-main)",
            borderWidth: "1px",
            opacity: feedback === "idle" ? 0.72 : 1,
          }}
          onChange={(e) => {
            if (feedback !== "idle") setFeedback("idle");
            setInputValue(e.target.value);
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (hasSubmitted) return;
              await submit();
            }
          }}
          placeholder=""
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          value={inputValue}
        />
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={prevQuestion}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
            style={{
              borderColor: "var(--color-text-sub)",
              color: "var(--color-text-main)",
              opacity: 0.82,
            }}
          >
            上一题
          </button>
          {!hasSubmitted ? (
            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
              style={{ backgroundColor: "var(--color-accent)", color: "var(--color-bg)" }}
            >
              查看答案
            </button>
          ) : null}
          <button
            type="button"
            onClick={addToMistakeCollection}
            disabled={Boolean(mistakeRecords[currentMistakeKey])}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            style={{
              borderColor: "var(--color-text-sub)",
              color: "var(--color-text-main)",
              opacity: 0.82,
            }}
          >
            {mistakeRecords[currentMistakeKey] ? "已在错题集" : "加入错题集"}
          </button>
          <button
            type="button"
            onClick={nextQuestion}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
            style={{
              borderColor: "var(--color-text-sub)",
              color: "var(--color-text-main)",
              opacity: 0.82,
            }}
          >
            下一题
          </button>
        </div>
        <p className="mt-3 text-center text-[11px]" style={{ color: "var(--color-text-sub)", opacity: 0.7 }}>
          {hasSubmitted
            ? "已显示正确答案，即将自动进入下一题"
            : practiceMode === "word"
              ? "单词模式：题目只显示中文，进入题目会自动朗读两遍"
              : "句子模式：题目只显示中文句子，进入题目会自动朗读两遍"}
        </p>
      </form>
    </section>
  );
}
