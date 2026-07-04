'use client';

import { useEffect, useState } from 'react';

const APP_DEMO_URL = process.env.NEXT_PUBLIC_DEMO_APP_URL ?? 'http://localhost:8081';

const NATIVE_W = 390;
const NATIVE_H = 844;

/** Ekranı saran eşit çerçeve kalınlığı (px) */
const BEZEL = 11;

const DEFAULT_SCALE = 0.8;
const DEFAULT_SIZE = {
  width: Math.round(NATIVE_W * DEFAULT_SCALE),
  height: Math.round(NATIVE_H * DEFAULT_SCALE),
  scale: DEFAULT_SCALE,
};

function getDeviceSize() {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const maxHeight = Math.min(viewportH * 0.74, viewportH - 150, 700);
  const maxWidth = Math.min(viewportW * 0.4, 360);
  const heightFromWidth = (maxWidth * NATIVE_H) / NATIVE_W;
  const targetHeight = Math.max(520, Math.min(maxHeight, heightFromWidth));

  const width = Math.round((targetHeight * NATIVE_W) / NATIVE_H);
  const scale = width / NATIVE_W;

  return {
    width: Math.round(NATIVE_W * scale),
    height: Math.round(NATIVE_H * scale),
    scale,
  };
}

export function PhoneMockup() {
  const [loaded, setLoaded] = useState(false);
  const [size, setSize] = useState(DEFAULT_SIZE);

  // Eş-merkezli köşeler: dış yarıçap = iç yarıçap + bezel
  const screenRadius = Math.round(size.width * 0.125);
  const bodyRadius = screenRadius + BEZEL;

  useEffect(() => {
    const update = () => setSize(getDeviceSize());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // onLoad tetiklenmezse spinner'ı kalıcı bırakma
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative z-20 flex flex-col items-center justify-center">
      {/* arka ışıma */}
      <div
        className="absolute rounded-[3rem] bg-brand/20 blur-[70px]"
        style={{ width: size.width + 130, height: size.height + 60 }}
      />
      <div className="absolute -bottom-5 h-10 w-56 rounded-full bg-ink/15 blur-2xl" />

      {/* telefon gövdesi */}
      <div
        className="relative shadow-phone"
        style={{
          width: size.width + BEZEL * 2,
          height: size.height + BEZEL * 2,
          padding: BEZEL,
          borderRadius: bodyRadius,
          background: 'linear-gradient(150deg, #34343c 0%, #17171d 42%, #0a0a0d 100%)',
          boxShadow:
            '0 30px 60px -18px rgba(15,15,25,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 1px rgba(255,255,255,0.14) inset',
        }}
      >
        {/* yan tuşlar */}
        <span className="absolute -left-[2.5px] h-[7%] w-[3px] rounded-l bg-gradient-to-b from-[#3a3a44] to-[#232329]" style={{ top: '20%' }} />
        <span className="absolute -left-[2.5px] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-[#3a3a44] to-[#232329]" style={{ top: '30%' }} />
        <span className="absolute -right-[2.5px] h-[13%] w-[3px] rounded-r bg-gradient-to-b from-[#3a3a44] to-[#232329]" style={{ top: '26%' }} />

        {/* ekran */}
        <div
          className="relative overflow-hidden bg-black"
          style={{ width: size.width, height: size.height, borderRadius: screenRadius }}
        >
          {!loaded && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
              <p className="text-xs text-ink-muted">Uygulama yükleniyor…</p>
            </div>
          )}

          {/* uygulama — native boyutta render edilip ölçekleniyor */}
          <div
            className="absolute left-0 top-0"
            style={{
              width: NATIVE_W,
              height: NATIVE_H,
              transform: `scale(${size.scale})`,
              transformOrigin: 'top left',
            }}
          >
            <iframe
              title="UniCampus canlı demo"
              src={`${APP_DEMO_URL}?theme=light&demo=1`}
              className="phone-iframe block border-0 bg-white"
              style={{ width: NATIVE_W, height: NATIVE_H }}
              onLoad={() => setLoaded(true)}
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-brand/10 bg-white/85 px-3.5 py-1 text-[11px] text-ink-muted shadow-card backdrop-blur-sm">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Canlı etkileşimli demo
      </div>
    </div>
  );
}
