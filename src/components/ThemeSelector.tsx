"use client";

import { useState } from "react";
import { presetThemes, type ThemeColors } from "@/lib/themes";
import { useTheme } from "@/components/ThemeProvider";

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--color-text-sub)" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-none bg-transparent"
        />
        <span className="font-typing text-xs" style={{ color: "var(--color-text-main)" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function ThemeSelector({ onClose }: { onClose: () => void }) {
  const { current, setTheme, setCustom } = useTheme();
  const [custom, setCustomState] = useState<ThemeColors>(current.colors);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: "var(--color-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-2xl transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-sub)" }}
        >
          ×
        </button>

        {/* 标题 */}
        <h2
          className="text-3xl font-bold"
          style={{ color: "var(--color-text-main)" }}
        >
          Themes
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-text-sub)" }}
        >
          choose or create your aesthetic
        </p>

        <div className="mt-8 flex gap-8">
          {/* 左侧：预设主题 */}
          <div className="flex-1">
            <p
              className="mb-4 text-[10px] uppercase tracking-widest"
              style={{ color: "var(--color-text-sub)" }}
            >
              Predefined
            </p>
            <div className="grid grid-cols-2 gap-3">
              {presetThemes.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTheme(t.key);
                    setCustomState(t.colors);
                  }}
                  className="rounded-xl px-4 py-3 text-left transition-all"
                  style={{
                    backgroundColor: t.colors.bg,
                    border:
                      current.key === t.key
                        ? `2px solid ${t.colors.accent}`
                        : "2px solid transparent",
                  }}
                >
                  <span
                    className="font-typing block text-sm font-medium"
                    style={{ color: t.colors.textMain }}
                  >
                    {t.name}
                  </span>
                  <div className="mt-2 flex gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: t.colors.accent }}
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: t.colors.textSub }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：自定义主题 */}
          <div className="flex-1">
            <p
              className="mb-4 text-[10px] uppercase tracking-widest"
              style={{ color: "var(--color-text-sub)" }}
            >
              Custom Theme
            </p>
            <div
              className="rounded-xl border p-6"
              style={{ borderColor: "var(--color-text-sub)", opacity: 0.9 }}
            >
              <div className="grid grid-cols-2 gap-5">
                <ColorInput
                  label="Background"
                  value={custom.bg}
                  onChange={(v) => setCustomState((s) => ({ ...s, bg: v }))}
                />
                <ColorInput
                  label="Text Main"
                  value={custom.textMain}
                  onChange={(v) => setCustomState((s) => ({ ...s, textMain: v }))}
                />
                <ColorInput
                  label="Text Sub"
                  value={custom.textSub}
                  onChange={(v) => setCustomState((s) => ({ ...s, textSub: v }))}
                />
                <ColorInput
                  label="Accent"
                  value={custom.accent}
                  onChange={(v) => setCustomState((s) => ({ ...s, accent: v }))}
                />
              </div>

              <button
                className="mt-6 w-full rounded-lg py-2.5 text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-accent)",
                  color: "var(--color-bg)",
                }}
                onClick={() => setCustom(custom)}
              >
                Save Custom Theme
              </button>
            </div>

            <button
              className="mt-4 w-full text-center text-[11px] uppercase tracking-widest transition-opacity hover:opacity-70"
              style={{ color: "var(--color-text-sub)" }}
              onClick={() => {
                setTheme("serika-dark");
                setCustomState(presetThemes[0].colors);
              }}
            >
              Reset to Default Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
