import { TypingInterface } from "@/components/TypingInterface";
import { mockWords } from "@/data/mockWords";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-ink md:px-10">
      <TypingInterface
        words={mockWords}
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
    </main>
  );
}
