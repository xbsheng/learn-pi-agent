import * as fs from "fs";
import * as path from "path";
import type {
  AgentVersion,
  VersionDiff,
  DocContent,
  VersionIndex,
} from "../src/types/agent-data";
import { VERSION_META, LEARNING_PATH } from "../src/lib/constants";

const WEB_DIR = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_DIR, "..");
const OUT_DIR = path.join(WEB_DIR, "src", "data", "generated");
const LOCALES = ["zh", "en"] as const;
type Locale = (typeof LOCALES)[number];

interface ChapterSource {
  id: string;
  dirName: string;
  dirPath: string;
  codePath: string;
  readmePath: string;
  tsFiles: string[];
}

function dirToVersionId(dirName: string): string | null {
  const match = dirName.match(/^(s\d{2})_/);
  return match ? match[1] : null;
}

function listChapters(): ChapterSource[] {
  return fs
    .readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => /^s\d{2}_/.test(entry.name))
    .sort()
    .map((entry) => {
      const id = dirToVersionId(entry.name);
      if (!id || !VERSION_META[id]) return null;
      const dirPath = path.join(REPO_ROOT, entry.name);
      const codePath = path.join(dirPath, "code.ts");
      const readmePath = path.join(dirPath, "README.md");
      if (!fs.existsSync(codePath) || !fs.existsSync(readmePath)) return null;
      const tsFiles = fs
        .readdirSync(dirPath)
        .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
        .map((f) => path.join(dirPath, f));
      return { id, dirName: entry.name, dirPath, codePath, readmePath, tsFiles };
    })
    .filter((c): c is ChapterSource => c !== null);
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
}

function countLoc(source: string): number {
  return source.split("\n").filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed !== "" &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*")
    );
  }).length;
}

function extractTools(sources: string[]): string[] {
  const tools = new Set<string>();
  for (const source of sources) {
    const definePattern = /defineTool\(\s*\{[\s\S]*?name:\s*"([\w.-]+)"/g;
    let block: RegExpExecArray | null;
    while ((block = definePattern.exec(source)) !== null) {
      tools.add(block[1]);
    }
    // 兼容显式注册：pi.registerTool({ name: "..." })
    const registerPattern = /registerTool\(\s*\{[\s\S]*?name:\s*"([\w.-]+)"/g;
    let reg: RegExpExecArray | null;
    while ((reg = registerPattern.exec(source)) !== null) {
      tools.add(reg[1]);
    }
  }
  return Array.from(tools);
}

function extractClasses(
  source: string
): { name: string; startLine: number; endLine: number }[] {
  const classes: { name: string; startLine: number; endLine: number }[] = [];
  const lines = source.split("\n");
  const pattern = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (!match) continue;
    let endLine = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^(?:export\s+)?(?:abstract\s+)?class\s/.test(lines[j]) || /^export\s+(?:async\s+)?function\s/.test(lines[j])) {
        endLine = j;
        break;
      }
    }
    classes.push({ name: match[1], startLine: i + 1, endLine });
  }
  return classes;
}

function extractFunctions(
  source: string
): { name: string; signature: string; startLine: number }[] {
  const functions: { name: string; signature: string; startLine: number }[] = [];
  const lines = source.split("\n");
  const patterns = [
    /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/,
  ];
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      const match = lines[i].match(pattern);
      if (!match) continue;
      functions.push({
        name: match[1],
        signature: `${match[1]}(${match[2]})`,
        startLine: i + 1,
      });
      break;
    }
  }
  return functions;
}

function rewriteChapterMarkdown(content: string, locale: Locale): string {
  // 去掉 README 顶部的语言切换行（网站上由站点自身的语言切换代替）。
  let next = content.replace(/^\[(?:English|中文)\][^\n]*\n+/, "");
  // ../sNN_xxx/  ->  /<locale>/sNN
  next = next.replace(/\]\(\.\.\/(s\d{2}_[^)\/]+)\/?\)/g, (_m, dirName) => {
    const id = dirToVersionId(dirName);
    return id ? `](/${locale}/${id})` : `](../${dirName}/)`;
  });
  next = next.replace(/\]\((s\d{2}_[^)\/]+)\/?\)/g, (_m, dirName) => {
    const id = dirToVersionId(dirName);
    return id ? `](/${locale}/${id})` : `](${dirName}/)`;
  });
  return next;
}

function buildVersions(chapters: ChapterSource[]): AgentVersion[] {
  return chapters.map((chapter) => {
    const source = readText(chapter.codePath);
    const sources = chapter.tsFiles.map(readText);
    const meta = VERSION_META[chapter.id];
    return {
      id: chapter.id,
      filename: `${chapter.dirName}/code.ts`,
      title: meta?.title ?? chapter.id,
      subtitle: meta?.subtitle ?? "",
      loc: countLoc(source),
      tools: extractTools(sources),
      newTools: [],
      coreAddition: meta?.coreAddition ?? "",
      keyInsight: meta?.keyInsight ?? "",
      classes: sources.flatMap(extractClasses),
      functions: sources.flatMap(extractFunctions),
      layer: meta?.layer ?? "loop",
      source,
      images: [],
    };
  });
}

function buildDocs(chapters: ChapterSource[]): DocContent[] {
  const docs: DocContent[] = [];
  for (const chapter of chapters) {
    for (const locale of LOCALES) {
      const file = locale === "zh" ? "README.md" : "README.en.md";
      const filePath = path.join(chapter.dirPath, file);
      if (!fs.existsSync(filePath)) continue;
      docs.push({
        version: chapter.id,
        locale,
        title: VERSION_META[chapter.id]?.title ?? chapter.id,
        content: rewriteChapterMarkdown(readText(filePath), locale),
      });
    }
  }
  return docs;
}

function computeNewTools(versions: AgentVersion[]) {
  for (let i = 0; i < versions.length; i++) {
    const prev = i > 0 ? new Set(versions[i - 1].tools) : new Set<string>();
    versions[i].newTools = versions[i].tools.filter((tool) => !prev.has(tool));
  }
}

function buildDiffs(versions: AgentVersion[]): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  const map = new Map(versions.map((v) => [v.id, v]));

  for (let i = 1; i < LEARNING_PATH.length; i++) {
    const fromVer = map.get(LEARNING_PATH[i - 1]);
    const toVer = map.get(LEARNING_PATH[i]);
    if (!fromVer || !toVer) continue;

    const fromClasses = new Set(fromVer.classes.map((c) => c.name));
    const fromFunctions = new Set(fromVer.functions.map((f) => f.name));
    const fromTools = new Set(fromVer.tools);

    diffs.push({
      from: fromVer.id,
      to: toVer.id,
      newClasses: toVer.classes.map((c) => c.name).filter((n) => !fromClasses.has(n)),
      newFunctions: toVer.functions.map((f) => f.name).filter((n) => !fromFunctions.has(n)),
      newTools: toVer.tools.filter((t) => !fromTools.has(t)),
      locDelta: toVer.loc - fromVer.loc,
    });
  }
  return diffs;
}

function main() {
  console.log("Extracting pi course content...");
  console.log(`  Repo root: ${REPO_ROOT}`);

  const chapters = listChapters();
  const versions = buildVersions(chapters);
  const docs = buildDocs(chapters);
  computeNewTools(versions);
  const diffs = buildDiffs(versions);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index: VersionIndex = { versions, diffs };
  fs.writeFileSync(path.join(OUT_DIR, "versions.json"), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "docs.json"), JSON.stringify(docs, null, 2));

  console.log("\nExtraction complete:");
  console.log(`  ${versions.length} versions, ${diffs.length} diffs, ${docs.length} docs`);
  for (const v of versions) {
    console.log(`    ${v.id}: ${v.loc} LOC, ${v.tools.length} tools`);
  }
}

main();
