"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  PenLine,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BloomMark, BloomWordmark } from "./brand";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/lib/studio/tools";

const items = [
  { slug: "", short: "Trang chủ", name: "Trang chủ", icon: LayoutGrid },
  ...TOOLS,
];

export function StudioNav() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const navigating = useRef(false);
  useEffect(() => setPortal(document.getElementById("studio-overlays")), []);
  useEffect(() => setMore(false), [path]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      if (desktop.matches) {
        navigating.current = true;
        setMore(false);
      }
    };
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);
  const primary = [
    {
      href: "/studio",
      label: "Trang chủ",
      icon: LayoutGrid,
      active: path === "/studio",
    },
    {
      href: "/studio/documents",
      label: "Tài liệu",
      icon: FileText,
      active: path.startsWith("/studio/documents"),
    },
    {
      href: "/studio/writing",
      label: "Viết bài",
      icon: PenLine,
      active: path.startsWith("/studio/writing"),
    },
  ];
  const otherActive = !primary.some((p) => p.active);
  const navigate = () => {
    navigating.current = true;
    setMore(false);
  };
  const isActive = (slug: string) =>
    slug ? path.startsWith(`/studio/${slug}`) : path === "/studio";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[76px] shrink-0 flex-col border-r border-white/70 bg-white/50 px-3 py-5 backdrop-blur lg:flex xl:w-60">
        <Link
          href="/studio"
          aria-label="Bloom · Một góc nhỏ của bạn"
          className="mb-6 flex items-center justify-center gap-2 px-1 xl:justify-start xl:px-2"
        >
          <BloomMark size={36} />
          <span className="hidden leading-tight xl:block">
            <BloomWordmark />
            <span className="block text-xs text-slate-500">
              Một góc nhỏ của bạn
            </span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((t) => (
            <Link
              key={t.slug}
              href={t.slug ? `/studio/${t.slug}` : "/studio"}
              title={t.name}
              aria-label={t.name}
              className={cn(
                "flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition xl:justify-start",
                isActive(t.slug)
                  ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-100"
                  : "text-slate-600 hover:bg-white/70",
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              <span className="hidden truncate xl:inline">{t.name}</span>
            </Link>
          ))}
        </nav>
        <a
          href="/"
          title="Trang chọn"
          aria-label="Trang chọn"
          className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/70 hover:text-slate-800 xl:justify-start"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="hidden xl:inline">Trang chọn</span>
        </a>
      </aside>

      <div className="studio-mobile-header">
        <Link
          href="/studio"
          aria-label="Bloom · Trang chủ"
          className="studio-mobile-brand"
        >
          <BloomMark size={34} />
          <span>
            <BloomWordmark />
            <small>Một góc nhỏ của bạn</small>
          </span>
        </Link>
        <Link
          href="/studio/helpers"
          className="studio-mobile-utility"
          aria-current={path.startsWith("/studio/helpers") ? "page" : undefined}
        >
          <FolderOpen size={17} />
          <span>Việc nhỏ</span>
        </Link>
      </div>
      <Dialog.Root
        open={more}
        onOpenChange={(value) => {
          navigating.current = false;
          setMore(value);
        }}
      >
        <nav className="studio-mobile-dock" aria-label="Điều hướng chính">
          {primary.slice(0, 2).map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={p.active ? "page" : undefined}
            >
              <p.icon size={21} strokeWidth={1.7} />
              <span>{p.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className="studio-mobile-chat"
            data-mobile-companion-trigger
            aria-label="Trò chuyện cùng Bloom"
            onClick={() => window.dispatchEvent(new Event("bloom:companion"))}
          >
            <BloomMark size={29} />
            <span>Bloom</span>
          </button>
          <Link
            href={primary[2].href}
            aria-current={primary[2].active ? "page" : undefined}
          >
            <PenLine size={21} strokeWidth={1.7} />
            <span>Viết bài</span>
          </Link>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Tất cả công cụ"
              className={otherActive ? "is-current" : undefined}
            >
              <MoreHorizontal size={23} />
              <span>Thêm</span>
            </button>
          </Dialog.Trigger>
        </nav>
        <Dialog.Portal container={portal}>
          <Dialog.Overlay className="studio-mobile-sheet-overlay" />
          <Dialog.Content
            className="studio-mobile-sheet"
            onCloseAutoFocus={(event) => {
              if (navigating.current) event.preventDefault();
            }}
          >
            <span className="studio-sheet-handle" aria-hidden="true" />
            <header>
              <div>
                <Dialog.Title>Cần một chút giúp đỡ?</Dialog.Title>
                <Dialog.Description>Chọn việc bạn muốn làm.</Dialog.Description>
              </div>
              <Dialog.Close
                className="studio-sheet-close"
                aria-label="Đóng menu công cụ"
              >
                <X size={20} />
              </Dialog.Close>
            </header>
            <div className="studio-mobile-tools">
              {TOOLS.map((t) => (
                <Link
                  href={`/studio/${t.slug}`}
                  key={t.slug}
                  onClick={navigate}
                  aria-current={isActive(t.slug) ? "page" : undefined}
                >
                  <span className={cn("studio-mobile-tool-icon", t.tint)}>
                    <t.icon size={21} strokeWidth={1.7} />
                  </span>
                  <span>{t.name}</span>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
            <a className="studio-sheet-home" href="/" onClick={navigate}>
              <ChevronLeft size={16} />
              Về trang lời nhắn
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
