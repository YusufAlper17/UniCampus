import { DemoFocusButton } from '@/components/DemoFocusButton';

const FEATURES = [
  {
    icon: '◈',
    title: 'Sosyal akış',
    desc: 'Hikayeler, reels, anketler ve etkinlikler.',
    tint: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    icon: '⬡',
    title: 'Topluluklar',
    desc: 'Discord tarzı kanallar ve kulüp grupları.',
    tint: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    icon: '◎',
    title: 'Kariyer evreni',
    desc: 'Staj, projeler ve milestone — ayrı evren.',
    tint: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    icon: '✦',
    title: '.edu güveni',
    desc: 'Üniversite mail doğrulamalı öğrenci ağı.',
    tint: 'bg-rose-50 text-rose-600 border-rose-100',
  },
] as const;

const STACK = ['React Native', 'Expo', 'TypeScript', 'Fastify', 'PostgreSQL', 'Redis'] as const;

const STATS = [
  { value: '15+', label: 'Ekran' },
  { value: '30+', label: 'Mock kullanıcı' },
  { value: '100%', label: 'TypeScript' },
] as const;

export function HeroContent() {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/55 p-5 shadow-card backdrop-blur-md lg:p-7">
        {/* Rozet */}
        <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-soft/50 px-3 py-1 text-[11px] font-semibold text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Üniversite odaklı sosyal platform · MVP demo
        </div>

        {/* Başlık */}
        <div className="space-y-3">
          <h1 className="max-w-xl text-balance font-display text-[clamp(1.9rem,3.2vw,3.25rem)] font-extrabold leading-[1.06] tracking-tight text-ink">
            Üniversite hayatın,{' '}
            <span className="bg-gradient-to-r from-brand to-brand-glow bg-clip-text text-transparent">
              tek uygulamada
            </span>
          </h1>
          <p className="max-w-lg text-[13px] leading-relaxed text-ink-muted lg:text-sm">
            Sosyal akış, topluluklar ve kariyer — kampüs hayatın için tek platform.
            Sağdaki telefondan canlı deneyebilirsin.
          </p>
        </div>

        {/* Özellikler — kompakt yatay kartlar */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/70 p-3 transition hover:bg-white/90"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm ${f.tint}`}
              >
                {f.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[13px] font-bold text-ink">{f.title}</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alt satır: tech + stats */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/5 pt-4 max-h-[780px]:hidden">
          <div className="flex flex-wrap gap-1.5">
            {STACK.map((t) => (
              <span
                key={t}
                className="rounded-md border border-ink/5 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-ink-muted"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="hidden h-4 w-px bg-ink/10 xl:block" />
          <div className="flex gap-5">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <span className="font-display text-lg font-bold text-ink">{s.value}</span>
                <span className="text-[10px] text-ink-faint">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <DemoFocusButton className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark">
            Emülatörde dene
            <span aria-hidden>→</span>
          </DemoFocusButton>
          <a
            href="https://github.com/YusufAlper17/UniCampus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-ink-muted transition hover:text-brand"
          >
            GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
