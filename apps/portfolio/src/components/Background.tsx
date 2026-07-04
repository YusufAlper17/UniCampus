export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Ana sıcak zemin */}
      <div className="absolute inset-0 bg-gradient-to-br from-canvas via-canvas-warm to-[#F0EDE8]" />

      {/* Büyük renk lekeleri */}
      <div className="absolute -left-[20%] top-[10%] h-[500px] w-[500px] rounded-full bg-brand/8 blur-[100px] animate-pulse-soft" />
      <div className="absolute left-[42%] top-[26%] h-[560px] w-[560px] rounded-full bg-amber-300/12 blur-[120px] animate-float" />
      <div className="absolute bottom-[5%] left-[18%] h-[430px] w-[430px] rounded-full bg-teal-300/10 blur-[90px] animate-float-delayed" />

      {/* Nokta grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.35]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#5B4FE8" opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Diyagonal çizgiler — sol panel */}
      <div
        className="absolute left-0 top-0 h-full w-1/2 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(125deg, #5B4FE8 0px, #5B4FE8 1px, transparent 1px, transparent 48px)',
        }}
      />

      {/* Organik halkalar — sol/orta panel */}
      <svg
        className="absolute left-[47%] top-[12%] h-72 w-72 text-brand/5 animate-float"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      <div className="absolute right-[7%] top-[12%] h-[72%] w-[28%] rounded-[48px] border border-white/40 bg-white/15 shadow-glow backdrop-blur-[2px]" />

      {/* Üst fade */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canvas/80 to-transparent" />
    </div>
  );
}
