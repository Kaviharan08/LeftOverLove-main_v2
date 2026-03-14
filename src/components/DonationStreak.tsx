interface Props {
  listings: { created_at: string }[];
}

function getStreak(listings: { created_at: string }[]): number {
  if (!listings.length) return 0;
  const donatedDates = new Set(
    listings.map((l) => new Date(l.created_at).toDateString())
  );
  // Check consecutive weeks backwards
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd   = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const donated = listings.some((l) => {
      const d = new Date(l.created_at);
      return d >= weekStart && d < weekEnd;
    });
    if (donated) streak++;
    else if (i > 0) break; // allow current week to be in progress
  }
  return streak;
}

export function DonationStreak({ listings }: Props) {
  const streak = getStreak(listings);
  if (streak < 2) return null;

  const message =
    streak >= 10 ? "You're a legend! 🏆" :
    streak >= 5  ? "Amazing consistency! 🌟" :
    streak >= 3  ? "You're on fire! 🔥" :
    "Great streak! Keep it up!";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:border-orange-900/40 dark:from-orange-950/30 dark:to-amber-950/20 px-4 py-3">
      <span className="flame text-2xl">🔥</span>
      <div>
        <p className="font-semibold text-orange-700 dark:text-orange-400 text-sm">
          {streak}-week donation streak!
        </p>
        <p className="text-xs text-orange-600/70 dark:text-orange-500/60">{message}</p>
      </div>
    </div>
  );
}
