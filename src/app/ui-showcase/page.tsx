'use client';

import { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FormContainer,
  RadioGroupField,
  CheckboxGroupField,
  ToggleGroupField,
  SelectField,
  InputField,
} from '@/components/forms';
import { Loading } from '@/components/ui/loading';

import { z } from 'zod';

export default function UIShowcase() {
  const [activeTab, setActiveTab] = useState('design');
  // 同步Tab状态到URL
  const updateTabParam = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto min-h-screen space-y-8 px-4 py-8 md:px-6">
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <h1 className="text-container bg-gradient-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
          Lujiangc 主题与UI规范展示
        </h1>
      </div>

      <Tabs
        defaultValue={activeTab}
        onValueChange={updateTabParam}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="design">设计规范</TabsTrigger>
          <TabsTrigger value="components">组件展示</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="mt-6">
          <DesignSystemContent />
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <ComponentsShowcase />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DesignSystemContent() {
  return (
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

        <div className="mt-4 rounded-lg bg-card p-6 text-card-foreground">
          <h3 className="mb-4 text-xl font-medium">阴影系统</h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-sm">
              <span className="mb-2 text-sm font-medium">shadow-sm</span>
              <span className="text-xs text-muted-foreground">轻微阴影</span>
            </div>
            <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow">
              <span className="mb-2 text-sm font-medium">shadow</span>
              <span className="text-xs text-muted-foreground">默认阴影</span>
            </div>
            <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-md">
              <span className="mb-2 text-sm font-medium">shadow-md</span>
              <span className="text-xs text-muted-foreground">中等阴影</span>
            </div>
            <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-lg">
              <span className="mb-2 text-sm font-medium">shadow-lg</span>
              <span className="text-xs text-muted-foreground">大型阴影</span>
            </div>
            <div className="flex h-28 flex-col items-center justify-center rounded-md bg-background p-5 shadow-xl">
              <span className="mb-2 text-sm font-medium">shadow-xl</span>
              <span className="text-xs text-muted-foreground">超大阴影</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          响应式设计
        </h2>

        <div className="rounded-lg bg-card p-6 text-card-foreground">
          <h3 className="mb-4 text-xl font-medium">断点规范</h3>
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

        <div className="mt-6 rounded-lg bg-card p-6 text-card-foreground">
          <h3 className="mb-4 text-xl font-medium">Z-Index层级规范</h3>
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

        <div className="mt-6 rounded-lg bg-card p-6 text-card-foreground">
          <h3 className="mb-4 text-xl font-medium">边框圆角规范</h3>
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
      </section>
    </div>
  );
}

function ComponentsShowcase() {
  // 定义表单数据类型
  interface FormData {
    categories: string[];
    distance: string;
    rating: string;
    priceRange: string;
    keywords: string;
    singleRadio: string;
    multiCheckbox: string[];
    singleSelect: string;
  }

  // 添加表单验证模式
  const schema = z.object({
    categories: z.array(z.string()).min(1, '请至少选择一个分类'),
    distance: z.string().min(1, '请选择距离范围'),
    rating: z.string().min(1, '请选择评分要求'),
    priceRange: z.string().min(1, '请选择价格范围'),
    keywords: z
      .string()
      .min(1, '请输入关键词')
      .max(50, '关键词不能超过50个字符'),
    singleRadio: z.string().min(1, '请选择一个选项'),
    multiCheckbox: z.array(z.string()).min(1, '请至少选择一个选项'),
    singleSelect: z.string().min(1, '请选择一个选项'),
  });

  // 表单默认值
  const defaultFormValues: FormData = {
    categories: [],
    distance: '',
    rating: '',
    priceRange: '',
    keywords: '',
    singleRadio: '',
    multiCheckbox: [],
    singleSelect: '',
  };

  // 表单提交处理
  const handleFormSubmit = async (data: FormData) => {
    // 记录表单数据但不重置表单
    console.log('表单提交数据:', data);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // 表单值变化处理
  const handleValuesChange = (
    changedValues: Partial<FormData>,
    allValues: FormData,
  ) => {
    console.log('变更的值:', changedValues);
    console.log('所有的值:', allValues);
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <section className="space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          表单组件
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>综合表单示例</CardTitle>
            <CardDescription>
              展示所有表单组件的使用方法，包括自定义验证、同步URL等功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormContainer
              initialValues={defaultFormValues}
              onFinish={handleFormSubmit}
              submitText="提交表单"
              showReset={true}
              resetText="重置表单"
              syncToUrl={true}
              layout="vertical"
              onValuesChange={handleValuesChange}
              schema={schema}
            >
              <div className="space-y-6">
                <div className="rounded-md border p-4">
                  <h3 className="mb-4 text-lg font-medium">开关组选择</h3>
                  <div className="space-y-4">
                    <ToggleGroupField
                      name="categories"
                      label="分类选择"
                      description="请至少选择一个分类（必填多选）"
                      options={[
                        { value: 'tech', label: '科技' },
                        { value: 'design', label: '设计' },
                        { value: 'business', label: '商业' },
                        { value: 'lifestyle', label: '生活' },
                      ]}
                      mode="multiple"
                      tooltip="选择感兴趣的分类"
                    />

                    <ToggleGroupField
                      name="distance"
                      label="距离范围"
                      description="单选且选中后可取消"
                      options={[
                        { value: '1000', label: '1公里' },
                        { value: '3000', label: '3公里' },
                        { value: '5000', label: '5公里' },
                        { value: '10000', label: '10公里' },
                      ]}
                      mode="single"
                      tooltip="选择距离范围"
                    />

                    <ToggleGroupField
                      name="rating"
                      label="评分要求"
                      description="单选且选中后可取消"
                      options={[
                        { value: '3', label: '3星以上' },
                        { value: '4', label: '4星以上' },
                        { value: '4.5', label: '4.5星以上' },
                        { value: '5', label: '5星' },
                      ]}
                      mode="single"
                      optionType="button"
                      buttonStyle="outline"
                    />

                    <ToggleGroupField
                      name="priceRange"
                      label="价格范围"
                      description="单选且选中后可取消"
                      options={[
                        { value: '0_50', label: '50以下' },
                        { value: '50_100', label: '50-100' },
                        { value: '100_200', label: '100-200' },
                        { value: '200_999', label: '200以上' },
                      ]}
                      mode="single"
                      optionType="button"
                      buttonStyle="solid"
                    />
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <h3 className="mb-4 text-lg font-medium">其他表单组件</h3>
                  <div className="space-y-4">
                    <RadioGroupField
                      name="singleRadio"
                      label="单选框组"
                      description="请选择一个选项（单选）"
                      options={[
                        { value: 'option1', label: '选项一' },
                        { value: 'option2', label: '选项二' },
                        { value: 'option3', label: '选项三', disabled: true },
                        { value: 'option4', label: '选项四' },
                      ]}
                      direction="horizontal"
                    />

                    <CheckboxGroupField
                      name="multiCheckbox"
                      label="复选框组"
                      description="请选择多个选项（多选）"
                      options={[
                        { value: 'option1', label: '选项一' },
                        { value: 'option2', label: '选项二' },
                        { value: 'option3', label: '选项三' },
                        { value: 'option4', label: '选项四', disabled: true },
                      ]}
                      direction="horizontal"
                      tooltip="可以选择多个选项"
                    />

                    <SelectField
                      name="singleSelect"
                      label="下拉选择框"
                      description="请从下拉列表中选择一个选项"
                      placeholder="请选择..."
                      options={[
                        { value: 'option1', label: '选项一' },
                        { value: 'option2', label: '选项二' },
                        { value: 'option3', label: '选项三' },
                        { value: 'option4', label: '选项四', disabled: true },
                      ]}
                      allowClear={true}
                    />

                    <InputField
                      name="keywords"
                      label="关键词"
                      tooltip="输入搜索关键词"
                      placeholder="输入关键词搜索（必填）"
                      allowClear={true}
                    />
                  </div>
                </div>
              </div>
            </FormContainer>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="section-title border-l-4 border-primary pl-3 text-2xl font-semibold">
          基础组件
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
              <Button title="取消" variant="outline">
                取消
              </Button>
              <Button title="确认">确认</Button>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">按钮组件</h3>
            <div className="flex flex-wrap gap-3">
              <Button title="主要按钮">主要按钮</Button>
              <Button title="次要按钮" variant="secondary">
                次要按钮
              </Button>
              <Button title="轮廓按钮" variant="outline">
                轮廓按钮
              </Button>
              <Button title="危险按钮" variant="destructive">
                危险按钮
              </Button>
              <Button title="幽灵按钮" variant="ghost">
                幽灵按钮
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button title="加载中按钮" loading>
                加载中按钮
              </Button>
              <Button title="加载中" variant="secondary" loading>
                加载中
              </Button>
              <Button title="加载中" variant="outline" loading>
                加载中
              </Button>
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

          <div className="space-y-4">
            <h3 className="text-xl font-medium">骨架屏组件</h3>
            <Card className="p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">基础骨架屏</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium">单行骨架</p>
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">自定义宽度骨架</p>
                      <div className="space-y-2">
                        <Skeleton
                          lines={['100%', '75%', '50%']}
                          className="h-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">圆形骨架屏</h4>
                  <div className="flex space-x-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">小尺寸</p>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">中尺寸</p>
                      <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">大尺寸</p>
                      <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">加载组件</h3>
            <Card className="p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">基础加载组件</h4>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="flex flex-col items-center">
                      <p className="mb-2 text-sm font-medium">小尺寸</p>
                      <Loading size="sm" />
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="mb-2 text-sm font-medium">默认尺寸</p>
                      <Loading />
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="mb-2 text-sm font-medium">大尺寸</p>
                      <Loading size="lg" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">不同变体</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col items-center">
                      <p className="mb-2 text-sm font-medium">带文本</p>
                      <Loading text="加载中，请稍候..." />
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="mb-2 text-sm font-medium">不同颜色</p>
                      <div className="flex space-x-4">
                        <Loading variant="default" size="sm" />
                        <Loading variant="secondary" size="sm" />
                        <Loading variant="destructive" size="sm" />
                        <Loading variant="muted" size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
