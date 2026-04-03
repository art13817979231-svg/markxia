import { NextRequest } from "next/server";
import * as googleTTS from "google-tts-api";

export const runtime = "nodejs";

const TTS_HOSTS = [
  "https://translate.google.com",
  "https://translate.google.cn",
  "https://translate.googleapis.com",
];

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text")?.trim() || "";
  if (!text) {
    return new Response("Missing text", { status: 400 });
  }

  try {
    for (const host of TTS_HOSTS) {
      try {
        const url = googleTTS.getAudioUrl(text.slice(0, 180), {
          lang: "en",
          slow: false,
          host,
        });

        const upstream = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            Accept: "audio/mpeg,*/*;q=0.8",
          },
        });

        if (!upstream.ok || !upstream.body) continue;

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=300",
          },
        });
      } catch {
        // Try next host.
      }
    }

    return new Response("TTS upstream failed", { status: 502 });
  } catch {
    return new Response("TTS error", { status: 500 });
  }
}
