import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';

const APP_DEMO_URL = process.env.NEXT_PUBLIC_DEMO_APP_URL ?? 'http://localhost:8081';

export default function TryAppPage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-white/95 to-white/0"
        aria-hidden
      />

      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-ink/5 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <Wordmark size="sm" />
        <Link
          href="/"
          className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink-muted shadow-card"
        >
          ← Portfolyo
        </Link>
      </header>

      <div className="absolute inset-x-0 bottom-0 top-[calc(3.25rem+env(safe-area-inset-top))]">
        <iframe
          title="UniCampus tam ekran demo"
          src={`${APP_DEMO_URL}?theme=light&demo=1`}
          className="phone-iframe h-full w-full bg-white"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </main>
  );
}
