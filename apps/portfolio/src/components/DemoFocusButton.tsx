'use client';

import type { ReactNode } from 'react';

interface DemoFocusButtonProps {
  children: ReactNode;
  className?: string;
}

/** Emülatör bölümünü vurgular — scroll kapalı olduğu için anchor yerine görsel feedback. */
export function DemoFocusButton({ children, className }: DemoFocusButtonProps) {
  function focusDemo() {
    const el = document.getElementById('demo');
    if (!el) return;

    el.classList.add('demo-focus');
    window.setTimeout(() => el.classList.remove('demo-focus'), 2200);

    const iframe = el.querySelector('iframe');
    if (iframe instanceof HTMLIFrameElement) {
      iframe.focus();
    }
  }

  return (
    <button type="button" onClick={focusDemo} className={className}>
      {children}
    </button>
  );
}
