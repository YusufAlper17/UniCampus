'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function shouldOpenFullscreenDemo() {
  const isNarrow = window.matchMedia('(max-width: 1023px)').matches;
  const isPhoneUserAgent = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
  const isTouchPhone = navigator.maxTouchPoints > 0 && window.innerWidth <= 1023;

  return isNarrow || isPhoneUserAgent || isTouchPhone;
}

export function MobileRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (shouldOpenFullscreenDemo()) {
      router.replace('/try');
    }
  }, [router]);

  return null;
}
