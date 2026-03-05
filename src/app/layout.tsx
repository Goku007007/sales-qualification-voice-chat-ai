import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'Sales Qualification AI Agent',
    template: '%s | Sales Qualification AI',
  },
  description:
    'Production-style AI sales qualification demo with live dashboard, voice input, lead scoring, and CRM integration across 5 industries.',
  keywords: [
    'AI sales agent',
    'lead qualification',
    'sales automation',
    'voice AI',
    'CRM integration',
    'SaaS',
    'real estate',
    'healthcare',
    'ecommerce',
    'consulting',
  ],
  authors: [{ name: 'Gokul' }],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Sales Qualification AI Agent',
    title: 'Sales Qualification AI Agent',
    description:
      'An autonomous voice and chat agent that qualifies leads, books meetings, and updates your CRM — powered by OpenAI.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sales Qualification AI Agent',
    description:
      'An autonomous voice and chat agent that qualifies leads, books meetings, and updates your CRM.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
