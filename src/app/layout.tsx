import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Header } from '@/components/layout/header';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Noto_Sans_SC } from 'next/font/google';
import { Metadata, Viewport } from 'next';
// import { AIAssistant } from '@/components/ui/jiangerAI/ai-assistant';
import { Suspense } from 'react';

// Noto Sans SC 支持中文和拉丁字符，是一个全面的字体选择
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: '江耳的梦境',
  description: '江耳的梦境 - 一些江耳的奇思妙想的实现以及个人简介和记录',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={notoSansSC.className}>
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense
              fallback={
                <div className="h-16 w-full border-b border-border bg-background"></div>
              }
            >
              <Header />
            </Suspense>
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            {/* <AIAssistant isFloating /> */}
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
