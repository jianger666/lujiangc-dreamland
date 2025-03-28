import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h2 className="text-2xl font-semibold">欢迎来到江耳的系统</h2>
        <p className="text-muted-foreground">
          这是一个使用Next.js、Tailwind CSS和Shadcn UI构建的应用程序
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/ui-showcase">查看UI风格规范</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
