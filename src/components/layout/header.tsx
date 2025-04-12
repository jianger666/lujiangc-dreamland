'use client';

import * as React from 'react';
import { Menu, MoreHorizontal, Layout } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Image, { ImageProps } from 'next/image';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  isExternal?: boolean;
  items?: Omit<NavItem, 'items'>[];
}

interface HeaderProps {
  navigationItems?: NavItem[];
  maxVisibleItems?: number;
  showUIShowcaseIcon?: boolean;
}

// 渲染子导航项的组件
const NavSubItem = ({
  subItem,
  pathname,
  onClick,
}: {
  subItem: Omit<NavItem, 'items'>;
  pathname: string;
  onClick?: () => void;
}) => (
  <Link
    key={subItem.title}
    href={subItem.href}
    className={cn(
      'flex cursor-pointer items-center justify-between py-2 text-muted-foreground transition-colors duration-200 hover:text-primary',
      pathname === subItem.href && 'font-medium text-primary',
    )}
    onClick={onClick}
  >
    <span>{subItem.title}</span>
  </Link>
);

export function Header({
  navigationItems = [
    {
      title: '吃啥转转',
      href: '/food-spinner',
    },
    {
      title: '江耳助手',
      href: '/ai-assistant',
    },
    // 有子菜单的导航项
    // {
    //   title: '导航',
    //   href: '/nav',
    //   description: '这是一个带有子菜单的导航项',
    //   items: [
    //     {
    //       title: '子导航1',
    //       href: '/nav3/sub1',
    //       description: '子导航项描述',
    //     },
    //     {
    //       title: '子导航2',
    //       href: '/nav3/sub2',
    //       description: '子导航项描述',
    //     },
    //   ],
    // },
  ],
  maxVisibleItems = 5,
  showUIShowcaseIcon = false,
}: HeaderProps) {
  const [isOpen, setOpen] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 检查URL中是否有控制导航栏显示的参数
  const hideNav = searchParams.get('hideNav') === 'true';

  // 如果URL参数指定隐藏导航栏，则不渲染整个组件
  if (hideNav) {
    return null;
  }

  const visibleItems = navigationItems.slice(0, maxVisibleItems);
  const hiddenItems = navigationItems.slice(maxVisibleItems);

  // 渲染Logo组件
  const LogoComponent = (props?: Omit<ImageProps, 'src' | 'alt'>) => (
    <Link href="/" className="flex items-center">
      <Image
        src="/logo/logo_primary.png"
        alt="Logo"
        style={{ objectFit: 'contain' }}
        priority
        {...(props ?? {})}
      />
    </Link>
  );

  return (
    <header className="sticky left-0 top-0 z-40 w-full border-b border-border bg-background shadow-sm backdrop-blur-sm">
      <div className="relative flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <LogoComponent width={140} height={42} className="h-10 w-auto" />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center justify-center lg:flex">
          <NavigationMenu>
            <NavigationMenuList className="flex flex-row justify-start gap-1">
              {visibleItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {!item.items ? (
                    <Link href={item.href} legacyBehavior passHref>
                      <NavigationMenuLink
                        className={cn(
                          'group relative inline-flex h-9 w-max cursor-pointer items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-primary focus:bg-accent focus:text-primary focus:outline-none',
                          {
                            'font-semibold text-primary':
                              pathname === item.href,
                          },
                        )}
                      >
                        {item.title}
                      </NavigationMenuLink>
                    </Link>
                  ) : (
                    <>
                      <NavigationMenuTrigger className="text-sm font-medium hover:text-primary data-[state=open]:text-primary">
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                          <li className="row-span-3">
                            <NavigationMenuLink asChild>
                              <Link
                                href={item.href}
                                className="from-muted/50 flex h-full w-full flex-col justify-between rounded-md bg-gradient-to-b to-muted p-4 no-underline outline-none focus:shadow-md"
                              >
                                <div className="mb-2 text-lg font-medium">
                                  {item.title}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                          {item.items?.map((subItem) => (
                            <li key={subItem.title}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={subItem.href}
                                  className="flex cursor-pointer flex-col gap-1 rounded-md p-3 hover:bg-muted hover:text-primary"
                                >
                                  <div className="text-sm font-medium">
                                    {subItem.title}
                                  </div>
                                  {subItem.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {subItem.description}
                                    </p>
                                  )}
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </>
                  )}
                </NavigationMenuItem>
              ))}

              {hiddenItems.length > 0 && (
                <NavigationMenuItem className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        title="更多导航项"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 cursor-pointer p-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">更多导航项</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {hiddenItems.map((item) => (
                        <DropdownMenuItem
                          key={item.title}
                          asChild
                          className="focus:bg-accent focus:text-primary"
                        >
                          <Link
                            href={item.href || '#'}
                            className={cn(
                              'flex w-full cursor-pointer items-center transition-colors hover:text-primary',
                              pathname === item.href &&
                                'font-medium text-primary',
                            )}
                          >
                            {item.title}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          {showUIShowcaseIcon && (
            <>
              {' '}
              <Button
                title="UI 展示页"
                variant="ghost"
                size="icon"
                className="rounded-full"
                asChild
              >
                <Link href="/ui-showcase" aria-label="UI 展示页">
                  <Layout className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}
          <ThemeToggle />

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  title="打开菜单"
                  variant="ghost"
                  size="icon"
                  className="relative"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">打开菜单</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <LogoComponent
                      width={120}
                      height={36}
                      className="h-9 w-auto"
                    />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-4">
                  {navigationItems.map((item) => (
                    <div key={item.title} className="py-2">
                      {!item.items ? (
                        <Link
                          href={item.href}
                          className={cn(
                            'flex cursor-pointer items-center justify-between py-2 text-foreground transition-colors duration-200 hover:text-primary',
                            pathname === item.href &&
                              'font-medium text-primary',
                          )}
                          onClick={() => setOpen(false)}
                        >
                          <span className="text-base">{item.title}</span>
                        </Link>
                      ) : (
                        <div className="space-y-3">
                          <Link
                            href={item.href}
                            className={cn(
                              'flex cursor-pointer items-center justify-between py-2 font-medium text-foreground transition-colors duration-200 hover:text-primary',
                              pathname === item.href && 'text-primary',
                            )}
                            onClick={() => setOpen(false)}
                          >
                            {item.title}
                          </Link>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          <div className="border-border/50 space-y-2 border-l pl-4">
                            {item.items?.map((subItem) => (
                              <NavSubItem
                                key={subItem.title}
                                subItem={subItem}
                                pathname={pathname}
                                onClick={() => setOpen(false)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {showUIShowcaseIcon && (
                    <Link
                      href="/ui-showcase"
                      className="mt-4 flex cursor-pointer items-center gap-2 border-t py-2 pt-4 text-muted-foreground hover:text-primary"
                      onClick={() => setOpen(false)}
                    >
                      <Layout className="h-4 w-4" />
                      <span>UI 展示页</span>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
