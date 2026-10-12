"use client";

import { useMemo } from "react";

interface SourceViewerProps {
  source: string;
  filename: string;
}

const KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "var", "function",
  "return", "if", "else", "for", "of", "in", "while", "await", "async",
  "try", "catch", "finally", "throw", "new", "class", "extends",
  "implements", "interface", "type", "as", "typeof", "instanceof", "void",
  "null", "undefined", "true", "false", "this", "super", "yield", "break",
  "continue", "switch", "case", "do", "delete", "readonly", "public",
  "private", "protected", "static", "get", "set", "satisfies",
]);

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;

function highlightLine(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN.lastIndex = 0;

  while ((match = TOKEN.exec(line)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`p${last}`}>{line.slice(last, match.index)}</span>);
    }
    const token = match[0];
    let className = "";
    if (token.startsWith("//") || token.startsWith("/*")) {
      className = "text-zinc-400 italic";
    } else if (/^["'`]/.test(token)) {
      className = "text-emerald-500";
    } else if (/^\d/.test(token)) {
      className = "text-orange-400";
    } else if (KEYWORDS.has(token)) {
      className = "text-blue-400 font-medium";
    }
    nodes.push(
      className ? (
        <span key={`t${match.index}`} className={className}>
          {token}
        </span>
      ) : (
        <span key={`t${match.index}`}>{token}</span>
      )
    );
    last = match.index + token.length;
  }

  if (last < line.length) {
    nodes.push(<span key={`e${last}`}>{line.slice(last)}</span>);
  }

  return nodes;
}

export function SourceViewer({ source, filename }: SourceViewerProps) {
  const lines = useMemo(() => source.split("\n"), [source]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <span className="font-mono text-xs text-zinc-400">{filename}</span>
      </div>
      <div className="overflow-x-auto bg-zinc-950">
        <pre className="p-2 text-[10px] leading-4 sm:p-4 sm:text-xs sm:leading-5">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-2 inline-block w-6 shrink-0 select-none text-right text-zinc-600 sm:mr-4 sm:w-8">
                  {i + 1}
                </span>
                <span className="text-zinc-200">
                  {highlightLine(line)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
