import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

export default function UIShowcase() {
  return (
    <div className="container mx-auto min-h-screen space-y-8 px-4 py-8 md:px-6">
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <h1 className="text-container bg-gradient-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
          Lujiangc 主题与UI规范展示
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="space-y-6">
          <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
            颜色系统
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col space-y-2">
              <div className="h-20 w-full rounded-md border bg-background"></div>
              <span className="text-sm font-medium">背景 (Background)</span>
              <code className="text-xs text-muted-foreground">
                浅色：#ffffff / 深色：#292929
              </code>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="h-20 w-full rounded-md bg-foreground"></div>
              <span className="text-sm font-medium">前景 (Foreground)</span>
              <code className="text-xs text-muted-foreground">
                浅色：#333333 / 深色：#ffffff
              </code>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="h-20 w-full rounded-md bg-primary"></div>
              <span className="text-sm font-medium">主色 (Primary)</span>
              <code className="text-xs text-muted-foreground">
                浅/深色：#f3799e
              </code>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="h-20 w-full rounded-md bg-secondary"></div>
              <span className="text-sm font-medium">次要色 (Secondary)</span>
              <code className="text-xs text-muted-foreground">
                浅/深色：#f9c7d9
              </code>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="h-20 w-full rounded-md bg-muted"></div>
              <span className="text-sm font-medium">静音色 (Muted)</span>
              <code className="text-xs text-muted-foreground">
                浅色：#e8e9e9 / 深色：#464646
              </code>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="h-20 w-full rounded-md bg-accent"></div>
              <span className="text-sm font-medium">强调色 (Accent)</span>
              <code className="text-xs text-muted-foreground">
                浅色：#f8f8ff / 深色：#2d353e
              </code>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-card p-4 text-card-foreground">
            <h3 className="mb-2 text-xl font-medium">间距规范</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-8 w-8 p-[0.25rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">2xs - 0.25rem (4px)</div>
                  <div className="text-sm text-muted-foreground">
                    最小间距，用于紧凑元素
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-10 w-10 p-[0.5rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">xs - 0.5rem (8px)</div>
                  <div className="text-sm text-muted-foreground">
                    小间距，内部元素
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-12 w-12 p-[0.75rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">sm - 0.75rem (12px)</div>
                  <div className="text-sm text-muted-foreground">较小间距</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-14 w-14 p-[1rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">md - 1rem (16px)</div>
                  <div className="text-sm text-muted-foreground">
                    中等间距，标准使用
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-16 w-16 p-[1.5rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">lg - 1.5rem (24px)</div>
                  <div className="text-sm text-muted-foreground">大间距</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
            组件展示
          </h2>
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader className="bg-card pb-2">
                <CardTitle>卡片组件</CardTitle>
                <CardDescription>卡片可以包含各种内容和操作</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p>这是卡片内容区域，可以放置文本、图片或其他组件。</p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-2">
                <Button variant="outline">取消</Button>
                <Button>确认</Button>
              </CardFooter>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-medium">按钮组件</h3>
              <div className="flex flex-wrap gap-3">
                <Button>主要按钮</Button>
                <Button variant="secondary">次要按钮</Button>
                <Button variant="outline">轮廓按钮</Button>
                <Button variant="destructive">危险按钮</Button>
                <Button variant="ghost">幽灵按钮</Button>
                <Button variant="link">链接按钮</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-medium">开关组件</h3>
              <div className="flex flex-wrap gap-3">
                <Toggle>普通开关</Toggle>
                <Toggle variant="outline">轮廓开关</Toggle>
                <Toggle defaultPressed>选中状态</Toggle>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-card p-6 text-card-foreground">
              <h3 className="mb-4 text-xl font-medium">阴影系统</h3>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-sm">
                  <span className="mb-2 text-sm font-medium">shadow-sm</span>
                  <span className="text-xs text-muted-foreground">
                    轻微阴影
                  </span>
                </div>
                <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow">
                  <span className="mb-2 text-sm font-medium">shadow</span>
                  <span className="text-xs text-muted-foreground">
                    默认阴影
                  </span>
                </div>
                <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-md">
                  <span className="mb-2 text-sm font-medium">shadow-md</span>
                  <span className="text-xs text-muted-foreground">
                    中等阴影
                  </span>
                </div>
                <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-lg">
                  <span className="mb-2 text-sm font-medium">shadow-lg</span>
                  <span className="text-xs text-muted-foreground">
                    大型阴影
                  </span>
                </div>
                <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-xl">
                  <span className="mb-2 text-sm font-medium">shadow-xl</span>
                  <span className="text-xs text-muted-foreground">
                    超大阴影
                  </span>
                </div>
                <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-2xl">
                  <span className="mb-2 text-sm font-medium">shadow-2xl</span>
                  <span className="text-xs text-muted-foreground">
                    特大阴影
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          响应式断点
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">断点名称</th>
                <th className="p-2 text-left">尺寸</th>
                <th className="p-2 text-left">描述</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">xs</td>
                <td className="p-2">480px</td>
                <td className="p-2">超小型设备 (小型手机)</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">sm</td>
                <td className="p-2">640px</td>
                <td className="p-2">小型设备 (大型手机)</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">md</td>
                <td className="p-2">768px</td>
                <td className="p-2">中型设备 (平板)</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">lg</td>
                <td className="p-2">1024px</td>
                <td className="p-2">大型设备 (笔记本)</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">xl</td>
                <td className="p-2">1280px</td>
                <td className="p-2">超大型设备 (桌面)</td>
              </tr>
              <tr>
                <td className="p-2">2xl</td>
                <td className="p-2">1400px</td>
                <td className="p-2">特大型设备 (大桌面)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          Z-Index层级规范
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">层级名称</th>
                <th className="p-2 text-left">值</th>
                <th className="p-2 text-left">描述</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">behind</td>
                <td className="p-2">-1</td>
                <td className="p-2">位于默认层级之后</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">base</td>
                <td className="p-2">0</td>
                <td className="p-2">基础层级</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">raised</td>
                <td className="p-2">1</td>
                <td className="p-2">轻微提升</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">dropdown</td>
                <td className="p-2">10</td>
                <td className="p-2">下拉菜单</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">sticky</td>
                <td className="p-2">20</td>
                <td className="p-2">粘性元素</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">overlay</td>
                <td className="p-2">30</td>
                <td className="p-2">覆盖层</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">modal</td>
                <td className="p-2">40</td>
                <td className="p-2">模态框</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">popover</td>
                <td className="p-2">50</td>
                <td className="p-2">弹出框</td>
              </tr>
              <tr>
                <td className="p-2">tooltip</td>
                <td className="p-2">60</td>
                <td className="p-2">工具提示</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          边框圆角规范
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-sm bg-primary text-white">
              sm
            </div>
            <span className="text-sm font-medium">圆角-小 (sm)</span>
            <code className="text-xs text-muted-foreground">
              calc(var(--radius) - 4px)
            </code>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-md bg-primary text-white">
              md
            </div>
            <span className="text-sm font-medium">圆角-中 (md)</span>
            <code className="text-xs text-muted-foreground">
              calc(var(--radius) - 2px)
            </code>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-lg bg-primary text-white">
              lg
            </div>
            <span className="text-sm font-medium">圆角-大 (lg)</span>
            <code className="text-xs text-muted-foreground">
              var(--radius) (0.5rem)
            </code>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          更多间距规范
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-medium">XL到5XL间距</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-20 w-20 p-[2rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">xl - 2rem (32px)</div>
                  <div className="text-sm text-muted-foreground">超大间距</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-24 w-24 p-[2.5rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">2xl - 2.5rem (40px)</div>
                  <div className="text-sm text-muted-foreground">特大间距</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-28 w-28 p-[3rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">3xl - 3rem (48px)</div>
                  <div className="text-sm text-muted-foreground">
                    超特大间距
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-medium">最大间距</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-32 w-32 p-[4rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">4xl - 4rem (64px)</div>
                  <div className="text-sm text-muted-foreground">巨大间距</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 h-36 w-36 p-[5rem]">
                  <div className="h-full w-full bg-primary"></div>
                </div>
                <div>
                  <div className="font-medium">5xl - 5rem (80px)</div>
                  <div className="text-sm text-muted-foreground">最大间距</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
