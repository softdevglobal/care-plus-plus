import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = {
  title: 'Care++',
  description: 'A unified care and service operations workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
