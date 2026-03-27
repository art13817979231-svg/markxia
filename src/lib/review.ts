export type MistakeRecord = {
  wordId: string;
  wrongCount: number;
  lastSeenAt: string;
};

const REVIEW_WINDOWS_IN_DAYS = [1, 2, 4, 7, 15, 30];

export function scoreForReview(record: MistakeRecord, now = new Date()): number {
  const last = new Date(record.lastSeenAt);
  const daysSinceLastSeen = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

  const basePriority = record.wrongCount * 8;
  const decay = REVIEW_WINDOWS_IN_DAYS.filter((d) => daysSinceLastSeen >= d).length;

  return basePriority + decay * 5 + Math.max(daysSinceLastSeen, 0);
}
