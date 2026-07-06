import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dataFile = resolve(root, "data", "resources.json");
const org = process.env.AIAADC_ORG || "AIAADC";
const token = process.env.GITHUB_TOKEN;

const gradeRules = [
  [/freshman|wjf|linear|probability|discrete|digital|physics|c-programming/i, "大一"],
  [/sophomore|circuit|numerical|complex|signals|data-structure|artificial|analog|automatic|foundation/i, "大二"],
  [/presentation|note/i, "专题"],
];

const typeRules = [
  [/resources-for/i, "总仓"],
  [/note/i, "笔记"],
  [/presentation/i, "分享会"],
];

const titleMap = new Map([
  ["wjf", "微积分"],
  ["linear-algebra", "线性代数"],
  ["Probability-and-Statistics", "概率论与数理统计"],
  ["C-Programming-Language", "C 语言程序设计"],
  ["Digital-circuit", "数字电路"],
  ["Resources-for-freshman-in-AIA", "大一资源总仓"],
  ["Resources-for-sophomore-in-AIA", "大二资源总仓"],
]);

function inferByRules(name, rules, fallback) {
  const match = rules.find(([pattern]) => pattern.test(name));
  return match ? match[1] : fallback;
}

function titleFromName(repo) {
  return titleMap.get(repo.name) || repo.description || repo.name.replaceAll("-", " ");
}

function tagsFromRepo(repo) {
  const words = titleFromName(repo)
    .split(/[\s,，/]+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 3);
  return Array.from(new Set(words.length ? words : ["课程资料"]));
}

async function fetchRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`;
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos.filter((repo) => repo.name !== ".github");
}

async function fetchWithRetry(url, attempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, {
        headers: {
          "User-Agent": "AIAADC-resource-site",
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      lastError = error;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      console.warn(`Fetch failed on attempt ${attempt}/${attempts}; retrying in ${delay}ms`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    }
  }

  throw lastError;
}

async function readExisting() {
  try {
    const json = JSON.parse(await readFile(dataFile, "utf8"));
    return new Map((json.resources || []).map((item) => [item.name, item]));
  } catch {
    return new Map();
  }
}

const existing = await readExisting();
const repos = await fetchRepos();
const resources = repos.map((repo) => {
  const previous = existing.get(repo.name) || {};
  return {
    name: repo.name,
    title: previous.title || titleFromName(repo),
    description: repo.description || previous.description || "课程资料整理仓库",
    grade: previous.grade || inferByRules(repo.name, gradeRules, "专题"),
    type: previous.type || inferByRules(repo.name, typeRules, "课程资料"),
    tags: previous.tags?.length ? previous.tags : tagsFromRepo(repo),
    githubUrl: repo.html_url,
    mirrorUrl: previous.mirrorUrl || "",
    updatedAt: repo.updated_at,
    stars: repo.stargazers_count || 0,
  };
});

await writeFile(
  dataFile,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: `https://github.com/${org}`,
      resources,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Updated ${resources.length} resources in ${dataFile}`);
