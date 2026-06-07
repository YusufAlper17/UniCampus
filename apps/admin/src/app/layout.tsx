import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UniCampus Admin',
  description: 'Platform yönetimi, moderasyon ve monetizasyon paneli',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
