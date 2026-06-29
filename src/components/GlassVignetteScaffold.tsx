"use client";

import { Camera, PenTool, ScreenShare } from "lucide-react";
import { type ComponentType, useEffect, useRef, useState } from "react";

const GRID_GAP = 28;

export function GlassVignetteScaffold() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
      for (let y = GRID_GAP; y < height; y += GRID_GAP) {
        for (let x = GRID_GAP; x < width; x += GRID_GAP) {
          ctx.beginPath();
          ctx.arc(x, y, 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <canvas ref={canvasRef} className="absolute inset-0" aria-label="whiteboard-canvas" />

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-2 rounded-2xl border border-white/20 bg-slate-900/40 px-3 py-3 shadow-[0_18px_45px_-20px_rgba(14,165,233,0.55)] backdrop-blur-[16px] sm:gap-3 sm:px-4">
          <ControlButton icon={PenTool} label="画笔工具" />

          <ControlButton
            icon={Camera}
            label={isCameraEnabled ? "关闭摄像头" : "开启摄像头"}
            active={isCameraEnabled}
            onClick={() => setIsCameraEnabled((prev) => !prev)}
          />

          <ControlButton icon={ScreenShare} label="切换至屏幕共享" />
        </div>
      </div>
    </main>
  );
}

type ControlButtonProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

function ControlButton({ icon: Icon, label, active = false, onClick }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex min-w-[6.2rem] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition sm:text-sm ${
        active
          ? "border-cyan-300/80 bg-cyan-400/20 text-cyan-100"
          : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-200/50 hover:bg-cyan-300/15"
      } backdrop-blur-[16px]`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
