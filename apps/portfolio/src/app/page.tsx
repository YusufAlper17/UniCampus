import { Background } from '@/components/Background';
import { DemoFocusButton } from '@/components/DemoFocusButton';
import { HeroContent } from '@/components/HeroContent';
import { MobileRedirect } from '@/components/MobileRedirect';
import { PhoneMockup } from '@/components/PhoneMockup';
import { Wordmark } from '@/components/Wordmark';

export default function PortfolioPage() {
  return (
    <>
      <Background />

      <MobileRedirect />

      <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
        {/* Header */}
        <header className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between px-5 py-4 lg:px-10 lg:py-5">
          <Wordmark size="md" />
          <nav className="hidden items-center gap-6 text-sm text-ink-muted sm:flex">
            <DemoFocusButton className="text-sm text-ink-muted transition hover:text-brand">
              Demo
            </DemoFocusButton>
            <a
              href="https://github.com/YusufAlper17/UniCampus"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-brand"
            >
              Kaynak kod
            </a>
          </nav>
          <p className="hidden text-xs text-ink-faint lg:block">
            © {new Date().getFullYear()} Yusuf Alper İlhan
          </p>
        </header>

        {/* Ana layout */}
        <main className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 items-center gap-6 overflow-hidden px-5 pb-4 lg:grid-cols-[minmax(0,1.05fr)_0.95fr] lg:gap-8 lg:px-10 lg:pb-6">
          {/* Sol — açıklama */}
          <section className="order-2 min-h-0 overflow-hidden lg:order-1 lg:py-1 lg:pr-4">
            <HeroContent />
          </section>

          {/* Sağ — telefon emülatörü */}
          <section
            id="demo"
            className="order-1 z-20 flex min-h-0 justify-center lg:order-2 lg:items-center lg:self-stretch"
          >
            <PhoneMockup />
          </section>
        </main>
      </div>
    </>
  );
}
