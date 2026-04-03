import { useRef, useState } from "react";
import type { TypingWord } from "@/data/mockWords";

const presetBanksMeta: { key: string; name: string; file: string }[] = [
  { key: "elementary", name: "小学生词库 (110词)", file: "/wordbanks/elementary.json" },
  { key: "cet4", name: "四级核心词 (100词)", file: "/wordbanks/cet4.json" },
];

type BankReport = {
  total: number;
  beginnerReady: number;
  intermediateReady: number;
  advancedReady: number;
  missingSentence: number;
  missingParagraph: number;
};

function buildBankReport(words: TypingWord[]): BankReport {
  const total = words.length;
  const beginnerReady = words.filter((w) => w.word && w.chinese).length;
  const intermediateReady = words.filter((w) => w.sentence && w.sentenceZh).length;
  const advancedReady = words.filter((w) => w.paragraph && w.paragraphZh).length;

  return {
    total,
    beginnerReady,
    intermediateReady,
    advancedReady,
    missingSentence: Math.max(total - intermediateReady, 0),
    missingParagraph: Math.max(total - advancedReady, 0),
  };
}

function hasEnglishText(text?: string) {
  if (!text) return false;
  return /[a-zA-Z]/.test(text);
}

function parseTextToWords(text: string): TypingWord[] {
  const lines = text.trim().split(/\r?\n/);
  const words: TypingWord[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^word\s*,/i.test(line)) continue;
    // 支持逗号分隔或空格分隔
    const parts = line.includes("\t") ? line.split("\t") : line.split(",");
    if (parts.length >= 3) {
      const sentence = parts[3]?.trim() || "";
      const sentenceZh = parts[4]?.trim() || "";
      const paragraph = parts[5]?.trim() || "";
      const paragraphZh = parts[6]?.trim() || "";
      words.push({
        id: String(i + 1),
        word: parts[0].trim(),
        phonetic: parts[1].trim(),
        chinese: parts[2].trim(),
        sentence: sentence || undefined,
        sentenceZh: sentenceZh || undefined,
        paragraph: paragraph || undefined,
        paragraphZh: paragraphZh || undefined,
      });
    } else {
      const spaceParts = line.split(/\s+/);
      if (spaceParts.length >= 2) {
        words.push({
          id: String(i + 1),
          word: spaceParts[0].trim(),
          phonetic: "",
          chinese: spaceParts.slice(1).join(" ").trim(),
        });
      }
    }
  }
  return words;
}

export function WordBankSelector({
  onChange,
}: {
  onChange: (words: TypingWord[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<BankReport | null>(null);
  const [englishHint, setEnglishHint] = useState("");
  const [loading, setLoading] = useState(false);

  function updateEnglishHint(words: TypingWord[]) {
    const englishWordCount = words.filter((w) => hasEnglishText(w.word)).length;
    const englishSentenceCount = words.filter((w) => hasEnglishText(w.sentence)).length;
    const englishParagraphCount = words.filter((w) => hasEnglishText(w.paragraph)).length;

    if (englishWordCount === 0) {
      setEnglishHint("未检测到英文单词列（word），系统会回退到默认英文练习数据。");
      return;
    }

    if (englishSentenceCount === 0 || englishParagraphCount === 0) {
      setEnglishHint("检测到英文单词，但句子/段落缺英文内容时，中高级会回退到默认英文示例。");
      return;
    }

    setEnglishHint("英文字段检测通过：初级/中级/高级都会优先使用你的词库内容。");
  }

  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value;
    if (!key || key === "custom") return;
    const meta = presetBanksMeta.find((b) => b.key === key);
    if (!meta) return;
    setLoading(true);
    fetch(meta.file)
      .then((res) => {
        if (!res.ok) throw new Error("加载失败");
        return res.json() as Promise<TypingWord[]>;
      })
      .then((words) => {
        onChange(words);
        setReport(buildBankReport(words));
        updateEnglishHint(words);
      })
      .catch(() => alert("加载词库失败，请检查网络"))
      .finally(() => setLoading(false));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      const words = parseTextToWords(text);
      if (words.length) {
        onChange(words);
        setReport(buildBankReport(words));
        updateEnglishHint(words);
      }
      else alert("文件内容格式不正确，请参考模板");
    };
    reader.readAsText(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text");
    const words = parseTextToWords(text);
    if (words.length) {
      onChange(words);
      setReport(buildBankReport(words));
      updateEnglishHint(words);
    }
    else alert("粘贴内容格式不正确，请参考模板");
  }

  function handleTemplateDownload() {
    const csv =
      "word,phonetic,chinese,sentence,sentenceZh,paragraph,paragraphZh\n" +
      "apple,/ˈaepl/,苹果,I eat an apple every morning.,我每天早上吃一个苹果。,Healthy habits start with small choices.,健康习惯始于微小选择。\n" +
      "success,/səkˈses/,成功,Success comes from daily effort.,成功来自每天的努力。,,";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wordbank_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      className="mb-6 flex flex-col gap-4 rounded-xl border p-5"
      style={{
        borderColor: "var(--color-text-sub)",
        color: "var(--color-text-main)",
        backgroundColor: "transparent",
        opacity: 0.95,
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="font-medium" style={{ color: "var(--color-text-main)" }}>选择词库：</label>
        <select
          className="rounded px-3 py-2 outline-none"
          style={{
            border: "1px solid var(--color-text-sub)",
            color: "var(--color-text-main)",
            backgroundColor: "transparent",
          }}
          onChange={handlePresetChange}
          defaultValue=""
          disabled={loading}
        >
          <option value="">请选择</option>
          {presetBanksMeta.map((b) => (
            <option key={b.key} value={b.key}>{b.name}</option>
          ))}
          <option value="custom">自定义上传/粘贴</option>
        </select>
        {loading && (
          <span className="text-xs" style={{ color: "var(--color-accent)" }}>加载中…</span>
        )}
        <button
          className="ml-2 text-xs underline transition hover:opacity-70"
          style={{ color: "var(--color-accent)" }}
          type="button"
          onClick={handleTemplateDownload}
        >
          下载模板
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium" style={{ color: "var(--color-text-main)" }}>上传文件：</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileChange}
          className="rounded px-3 py-2 text-sm"
          style={{
            border: "1px solid var(--color-text-sub)",
            color: "var(--color-text-main)",
          }}
        />
        <span className="text-xs" style={{ color: "var(--color-text-sub)" }}>
          支持 CSV、TXT，或直接粘贴内容（英文列建议：word/sentence/paragraph）
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium" style={{ color: "var(--color-text-main)" }}>粘贴内容：</label>
        <textarea
          className="min-h-[80px] rounded px-3 py-2 outline-none"
          style={{
            border: "1px solid var(--color-text-sub)",
            color: "var(--color-text-main)",
            backgroundColor: "transparent",
          }}
          placeholder={"apple,/ˈaepl/,苹果,I eat an apple every morning.,我每天早上吃一个苹果。"}
          onPaste={handlePaste}
        />
      </div>
      <div className="text-xs" style={{ color: "var(--color-text-sub)" }}>
        <div>格式示例（可用 Excel 编辑后导出 CSV，英文内容放在 word/sentence/paragraph）：</div>
        <pre
          className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded p-2 leading-relaxed"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-text-sub) 20%, transparent)",
            color: "var(--color-text-main)",
          }}
        >
          {`word,phonetic,chinese,sentence,sentenceZh,paragraph,paragraphZh
apple,/ˈaepl/,苹果,I eat an apple every morning.,我每天早上吃一个苹果。,Healthy habits start with small choices.,健康习惯始于微小选择。`}
        </pre>
        <div>简化格式也可：cat 猫</div>
      </div>

      {report && (
        <div
          className="rounded-lg border p-3 text-xs"
          style={{
            borderColor: "var(--color-text-sub)",
            color: "var(--color-text-sub)",
            backgroundColor: "color-mix(in srgb, var(--color-text-sub) 10%, transparent)",
          }}
        >
          <div className="mb-1" style={{ color: "var(--color-text-main)" }}>
            字段校验结果
          </div>
          <div>总条目：{report.total}</div>
          <div>初级可用（word + chinese）：{report.beginnerReady}</div>
          <div>中级可用（sentence + sentenceZh）：{report.intermediateReady}</div>
          <div>高级可用（paragraph + paragraphZh）：{report.advancedReady}</div>
          <div className="mt-1">缺少句子字段条目：{report.missingSentence}</div>
          <div>缺少段落字段条目：{report.missingParagraph}</div>
          {englishHint && (
            <div className="mt-2" style={{ color: "var(--color-text-main)" }}>
              {englishHint}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
