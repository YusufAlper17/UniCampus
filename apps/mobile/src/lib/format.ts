// Göreli zaman (Türkçe kısa). Örn: "şimdi", "5d", "3sa", "2g".
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'şimdi';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}d`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}sa`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}g`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}h`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}B`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
