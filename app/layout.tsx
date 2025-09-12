import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disrupt Design Brief',
  description: 'Сбор ТЗ, анализ через GPT и генерация референсов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}

