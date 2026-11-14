import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VeriBounty — AI-Adjudicated Open-Source & Task Escrow on GenLayer',
  description:
    'Decentralized open-source bounty and task escrow platform where GenLayer Intelligent Contracts and Optimistic Democracy independently audit code diffs and settle payments.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
