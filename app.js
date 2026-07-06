const state = {
  resources: [],
  grade: "all",
  type: "all",
  query: "",
};

const elements = {
  grid: document.querySelector("#resourceGrid"),
  empty: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  repoCount: document.querySelector("#repoCount"),
  mirrorCount: document.querySelector("#mirrorCount"),
  latestUpdate: document.querySelector("#latestUpdate"),
  search: document.querySelector("#searchInput"),
  type: document.querySelector("#typeFilter"),
  filters: document.querySelectorAll(".filter"),
  install: document.querySelector("#installApp"),
};

const formatDate = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function resourceMatches(resource) {
  const haystack = normalize([
    resource.name,
    resource.title,
    resource.description,
    resource.grade,
    resource.type,
    ...(resource.tags || []),
  ].join(" "));
  const gradeOk = state.grade === "all" || resource.grade === state.grade;
  const typeOk = state.type === "all" || resource.type === state.type;
  const queryOk = !state.query || haystack.includes(normalize(state.query));
  return gradeOk && typeOk && queryOk;
}

function renderStats(resources) {
  const latest = resources
    .map((item) => new Date(item.updatedAt))
    .filter((date) => !Number.isNaN(date.valueOf()))
    .sort((a, b) => b - a)[0];

  elements.repoCount.textContent = resources.length;
  elements.mirrorCount.textContent = resources.filter((item) => item.mirrorUrl).length;
  elements.latestUpdate.textContent = latest ? formatDate.format(latest) : "--";
}

function renderResources() {
  const items = state.resources.filter(resourceMatches);
  elements.resultCount.textContent = `共 ${items.length} 项资源`;
  elements.empty.hidden = items.length > 0;

  elements.grid.innerHTML = items.map(renderCard).join("");
}

function renderCard(resource) {
  const updated = resource.updatedAt ? formatDate.format(new Date(resource.updatedAt)) : "待更新";
  const tags = (resource.tags || []).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("");
  const mirrorReady = Boolean(resource.mirrorUrl);
  const status = mirrorReady ? "镜像可用" : "待镜像";
  const highSpeed = mirrorReady
    ? `<a class="primary" href="${escapeAttribute(resource.mirrorUrl)}" target="_blank" rel="noreferrer">高速下载</a>`
    : `<button class="disabled" type="button" disabled>待镜像</button>`;

  return `
    <article class="resource-card">
      <div class="card-top">
        <div class="chips">
          <span class="chip">${escapeHtml(resource.grade || "未分类")}</span>
          <span class="chip type">${escapeHtml(resource.type || "资料")}</span>
        </div>
        <span class="status ${mirrorReady ? "ready" : ""}">${status}</span>
      </div>
      <h3>${escapeHtml(resource.title || resource.name)}</h3>
      <p class="desc">${escapeHtml(resource.description || "课程资料整理仓库")}</p>
      <div class="tags">${tags}</div>
      <div class="meta">
        <span>更新：${updated}</span>
        <span>Star：${Number(resource.stars || 0)}</span>
      </div>
      <div class="resource-actions">
        ${highSpeed}
        <a href="${escapeAttribute(resource.githubUrl)}" target="_blank" rel="noreferrer">GitHub 备用</a>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function loadResources() {
  try {
    const response = await fetch("./data/resources.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.resources = data.resources || [];
    renderStats(state.resources);
    renderResources();
  } catch (error) {
    elements.resultCount.textContent = "资源清单加载失败";
    elements.empty.hidden = false;
    elements.empty.textContent = "请检查 data/resources.json 是否存在。";
    console.error(error);
  }
}

function bindFilters() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderResources();
  });

  elements.type.addEventListener("change", (event) => {
    state.type = event.target.value;
    renderResources();
  });

  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.grade = button.dataset.value;
      elements.filters.forEach((item) => item.classList.toggle("is-active", item === button));
      renderResources();
    });
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }
}

function bindInstallPrompt() {
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    elements.install.hidden = false;
  });

  elements.install.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    elements.install.hidden = true;
  });
}

bindFilters();
bindInstallPrompt();
registerServiceWorker();
loadResources();
