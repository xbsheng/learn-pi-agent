"use client";

import { Fragment } from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import { getVersionMeta, LAYERS } from "@/lib/constants";
import { MECHANISM_MAP, MECHANISM_NODES } from "@/data/mechanism-map";
import { cn } from "@/lib/utils";

interface MechanismMapProps {
  version: string;
}

export function MechanismMap({ version }: MechanismMapProps) {
  const t = useTranslations("mechanism");
  const locale = useLocale();
  const info = MECHANISM_MAP[version];
  if (!info) return null;

  const meta = getVersionMeta(version, locale);
  const color = LAYERS.find((l) => l.id === meta?.layer)?.color ?? "#3B82F6";
  const isZh = locale === "zh";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {t("title")}
      </div>

      <div
        className={cn(
          info.wrap && "rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700"
        )}
      >
        {info.wrap && (
          <div className="mb-2 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
            {isZh ? info.wrap.zh : info.wrap.en}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {MECHANISM_NODES.map((node, i) => {
            const active = info.active.includes(node.id);
            return (
              <Fragment key={node.id}>
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    active
                      ? "font-medium text-white"
                      : "border-[var(--color-border)] text-zinc-400 dark:text-zinc-500"
                  )}
                  style={active ? { backgroundColor: color, borderColor: color } : undefined}
                >
                  {isZh ? node.zh : node.en}
                </span>
                {i < MECHANISM_NODES.length - 1 && (
                  <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
                    →
                  </span>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
        {isZh ? info.note.zh : info.note.en}
      </p>
    </div>
  );
}
