"use client";

import { WhatsNew } from "@/components/diff/whats-new";
import { DocRenderer } from "@/components/docs/doc-renderer";
import { SourceViewer } from "@/components/code/source-viewer";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n";
import versionsData from "@/data/generated/versions.json";
import type { VersionIndex } from "@/types/agent-data";

const data = versionsData as VersionIndex;

interface VersionDetailClientProps {
  version: string;
  diff: {
    from: string;
    to: string;
    newClasses: string[];
    newFunctions: string[];
    newTools: string[];
    locDelta: number;
  } | null;
  source: string;
  filename: string;
}

export function VersionDetailClient({
  version,
  diff,
  source,
  filename,
}: VersionDetailClientProps) {
  const t = useTranslations("version");
  const ts = useTranslations("structure");

  const versionInfo = data.versions.find((v) => v.id === version);

  const tabs = [
    { id: "learn", label: t("tab_learn") },
    { id: "code", label: t("tab_code") },
    { id: "deep-dive", label: t("tab_deep_dive") },
  ];

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} defaultTab="learn">
        {(activeTab) => (
          <>
            {activeTab === "learn" && <DocRenderer version={version} />}
            {activeTab === "code" && (
              <SourceViewer source={source} filename={filename} />
            )}
            {activeTab === "deep-dive" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {ts("classes")}
                    </h3>
                    {versionInfo && versionInfo.classes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {versionInfo.classes.map((cls) => (
                          <span
                            key={cls.name}
                            className="rounded-md bg-purple-50 px-2.5 py-1 font-mono text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                          >
                            {cls.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400">{ts("none")}</p>
                    )}
                  </Card>
                  <Card>
                    <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {ts("functions")}
                    </h3>
                    {versionInfo && versionInfo.functions.length > 0 ? (
                      <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {versionInfo.functions.map((fn) => (
                          <li key={fn.name} className="font-mono text-xs">
                            {fn.signature}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-400">{ts("none")}</p>
                    )}
                  </Card>
                </div>
                {diff && <WhatsNew diff={diff} />}
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
