"use strict";

const { items, yokai, bosses, flags, categories, tribes } = window.qrCatalog;
const groups = { item: items, yokai, boss: bosses, flag: flags };
const folders = {
  male: { item: "tinko/item", yokai: "tinko/yokai", boss: "tinko/boss_dex", flag: "flag_male" },
  female: { item: "manko/item", yokai: "manko/yokai", boss: "manko/boss_dex", flag: "flag_female" },
};
let imageSet = "male";
const collator = new Intl.Collator("ja", { numeric: true });
const pageSize = 30;
const $ = (selector) => document.querySelector(selector);
const tabs = [...document.querySelectorAll("[data-tab]")];
const setButtons = [...document.querySelectorAll("[data-set]")];
const queryInput = $("#query");
const clearSearch = $("#clear-search");
const categorySelect = $("#categories");
const entryList = $("#entries");
const entryTemplate = $("#entry-template");
const pager = $("#pager");
const resultHeading = $("#result-heading");
const dialog = $("#qr-dialog");
const qrDisplay = $("#qr-display");
const variants = $("#variants");
const saveImage = $("#save-image");
const scan = $("#scan");
const scanCode = $("#scan-code");
let currentEntry = null;
let currentGroup = null;
let currentIndex = 0;
const prereq = $("#prereq");
const prereqSummary = prereq.querySelector("summary");
const trouble = $("#trouble");
const categoryLabels = { all: "すべて", ...categories };
let state = readLocation();

function normalize(text) {
  return text.normalize("NFKC").toLowerCase()
    .replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[・.]/g, "")
    .trim();
}

function numberLabel(number) {
  return String(number).padStart(3, "0");
}

function imageUrl(group, filename) {
  return `${folders[imageSet][group]}/${encodeURIComponent(filename)}`;
}

function sortNames(a, b) {
  return collator.compare(a.name, b.name);
}

function entryMeta(entry, group) {
  if (group === "item") return categories[entry.category];
  if (group === "flag") return "ボス戦フラグ";
  if (entry.number == null) return "大辞典番号不明";
  const number = `No. ${numberLabel(entry.number)}`;
  if (group === "boss") return `${number} · 図鑑登録`;
  return tribes[entry.category] ? `${number} · ${tribes[entry.category]}` : number;
}

for (const item of items) {
  item.search = normalize(`${item.name} ${categories[item.category]}`);
}
for (const entry of [...yokai, ...bosses]) {
  entry.search = normalize(`${entry.name} ${tribes[entry.category] ?? ""}`);
}
for (const entry of flags) {
  entry.search = normalize(`${entry.name} フラグ ぼす 戦闘`);
}
items.sort(sortNames);
yokai.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || sortNames(a, b));
bosses.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || sortNames(a, b));

for (const [id, label] of Object.entries(categoryLabels)) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = label;
  categorySelect.append(option);
}

function readLocation() {
  const params = new URLSearchParams(location.hash.slice(1));
  const rawTab = params.get("tab");
  const tab = Object.hasOwn(groups, rawTab) ? rawTab : "item";
  imageSet = params.get("set") === "female" ? "female" : "male";
  const category = params.get("category");
  const rawPage = Number(params.get("page"));
  return {
    tab,
    category: tab === "item" && Object.hasOwn(categories, category) ? category : "all",
    query: params.get("q") ?? "",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

function writeLocation(method) {
  const params = new URLSearchParams();
  if (state.tab !== "item") params.set("tab", state.tab);
  if (imageSet !== "male") params.set("set", imageSet);
  if (state.category !== "all") params.set("category", state.category);
  if (state.query) params.set("q", state.query);
  if (state.page > 1) params.set("page", String(state.page));
  const hash = params.size ? `#${params}` : "";
  if (hash === location.hash) return;
  const url = new URL(location.href);
  url.hash = hash;
  history[method === "push" ? "pushState" : "replaceState"](null, "", url);
}

function setState(next, method = "replace") {
  state = { ...state, ...next };
  render();
  writeLocation(method);
}

function matches(entry, terms, group) {
  return terms.every((term) => {
    if (group !== "item" && group !== "flag" && /^(?:no)?\d{1,3}$/.test(term)) {
      return Number(term.replace(/^no/, "")) === entry.number;
    }
    return entry.search.includes(term);
  });
}

function makeEntry(entry, group) {
  const row = entryTemplate.content.firstElementChild.cloneNode(true);
  const button = row.querySelector("button");
  row.querySelector(".entry-meta").textContent = entryMeta(entry, group);
  row.querySelector(".entry-name").textContent = entry.name;
  button.addEventListener("click", () => openQr(entry, group));
  return row;
}

function render() {
  const { tab, category, query } = state;
  const isItem = tab === "item";
  const terms = normalize(query).replace(/\bno\s+(?=\d)/g, "no").split(/\s+/).filter(Boolean);
  const filtered = groups[tab].filter((entry) =>
    (!isItem || category === "all" || entry.category === category) && matches(entry, terms, tab)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * pageSize;

  $("#section-title").textContent = { item: "アイテム", yokai: "妖怪", boss: "ボス", flag: "フラグ" }[tab];
  $("#item-filters").hidden = !isItem;
  $("#flag-note").hidden = tab !== "flag";
  queryInput.placeholder = isItem ? "アイテム名で検索"
    : tab === "flag" ? "ボス名で検索"
    : tab === "boss" ? "ボス名・大辞典番号で検索" : "妖怪名・大辞典番号で検索";
  queryInput.setAttribute("aria-label", queryInput.placeholder);
  if (queryInput.value !== query) queryInput.value = query;
  clearSearch.hidden = query.length === 0;
  for (const link of tabs) {
    if (link.dataset.tab === tab) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  for (const button of setButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.set === imageSet));
  }
  categorySelect.value = category;

  resultHeading.textContent = isItem ? (category === "all" ? "すべてのアイテム" : categories[category])
    : tab === "boss" ? "図鑑番号順（図鑑登録のみ）"
    : tab === "flag" ? "ボス戦フラグ（読み込みやすくする推奨）" : "大辞典順";
  $("#result-count").textContent = `${filtered.length.toLocaleString("ja-JP")}件`;
  entryList.replaceChildren(...filtered.slice(start, start + pageSize).map((entry) => makeEntry(entry, tab)));
  entryList.hidden = filtered.length === 0;
  $("#empty").hidden = filtered.length > 0;
  pager.hidden = pageCount < 2;
  $("#prev-page").disabled = state.page === 1;
  $("#next-page").disabled = state.page >= pageCount;
  $("#page-status").textContent = `${state.page} / ${pageCount}`;
}

function openQr(entry, group) {
  currentEntry = entry;
  currentGroup = group;
  $("#dialog-title").textContent = entry.name;
  $("#dialog-meta").textContent = entryMeta(entry, group);
  variants.replaceChildren();
  variants.hidden = entry.images.length < 2;

  function showImage(index) {
    currentIndex = index;
    const filename = entry.images[index];
    const url = imageUrl(group, filename);
    const image = new Image(1280, 1280);
    image.alt = `${entry.name}のQRコード`;
    image.src = url;
    qrDisplay.replaceChildren(image);
    saveImage.href = url;
    saveImage.download = filename;
    for (const [position, button] of [...variants.children].entries()) {
      button.setAttribute("aria-pressed", String(position === index));
    }
  }

  if (!variants.hidden) {
    for (const index of entry.images.keys()) {
      const button = document.createElement("button");
      button.className = "secondary-button variant";
      button.type = "button";
      button.textContent = `QR ${index + 1}`;
      button.addEventListener("click", () => showImage(index));
      variants.append(button);
    }
  }
  showImage(0);
  dialog.showModal();
}

// QR画像から1モジュール=1pxの白黒画像を作り、整数倍で拡大する。
// 端数pxで拡大するとモジュール幅が揃わず、3DSのカメラが読み取りにくくなるため。
function moduleGrid(image) {
  const size = image.naturalWidth;
  if (!size) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, size, size).data;
  let left = size, top = size, right = -1;
  for (let y = 0; y < size; y += 1) {
    const row = y * size * 4;
    for (let x = 0; x < size; x += 1) {
      if (pixels[row + x * 4] > 127) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
    }
  }
  if (right < 0) return null;
  const moduleSize = 8;                 // 生成時の scale
  const modules = Math.round((right - left + 1) / moduleSize);
  if (modules < 21 || (modules - 17) % 4 !== 0) return null;
  const border = 4;                     // 生成時の border（モジュール数）
  const total = modules + border * 2;
  const origin = left - border * moduleSize;
  if (origin < 0 || top - border * moduleSize < 0) return null;
  const grid = document.createElement("canvas");
  grid.width = grid.height = total;
  const gridContext = grid.getContext("2d", { willReadFrequently: true });
  gridContext.imageSmoothingEnabled = false;
  gridContext.drawImage(image, origin, top - border * moduleSize,
                        total * moduleSize, total * moduleSize, 0, 0, total, total);
  return { grid, total };
}

function scanCanvas(image) {
  const found = moduleGrid(image);
  if (!found) return null;
  const ratio = window.devicePixelRatio || 1;
  const room = Math.min(window.innerWidth, window.innerHeight) * 0.94;
  const scale = Math.max(1, Math.floor((room * ratio) / found.total));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = found.total * scale;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(found.grid, 0, 0, canvas.width, canvas.height);
  canvas.style.width = canvas.style.height = `${canvas.width / ratio}px`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "QRコード");
  return canvas;
}

function enterScan() {
  if (!currentEntry) return;
  const url = imageUrl(currentGroup, currentEntry.images[currentIndex]);
  const source = qrDisplay.querySelector("img");
  const canvas = source && source.complete ? scanCanvas(source) : null;
  if (canvas) {
    scanCode.replaceChildren(canvas);
    scanCode.style.backgroundImage = "";
  } else {
    scanCode.replaceChildren();
    scanCode.style.backgroundImage = `url("${url}")`;
  }
  dialog.close();
  scan.hidden = false;
  const hint = document.querySelector("#scan-hint");
  hint.style.animation = "none";
  void hint.offsetWidth;
  hint.style.animation = "";
  document.body.classList.add("scanning");
  const root = document.documentElement;
  if (root.requestFullscreen && !document.fullscreenElement) {
    root.requestFullscreen().catch(() => {});
  }
}

function exitScan() {
  if (scan.hidden) return;
  if (scanCode.firstChild) {
    // キャンバスを保持したまま閉じると画面が残るので消す
    scanCode.replaceChildren();
  }
  scan.hidden = true;
  scanCode.style.backgroundImage = "";
  document.body.classList.remove("scanning");
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  if (!currentEntry) return;
  const index = currentIndex;
  openQr(currentEntry, currentGroup);
  if (index > 0 && variants.children[index]) variants.children[index].click();
}

function changePage(offset) {
  setState({ page: state.page + offset }, "push");
  resultHeading.focus();
  resultHeading.scrollIntoView({ block: "start" });
}

for (const link of tabs) {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.dataset.tab !== state.tab) {
      setState({ tab: link.dataset.tab, category: "all", query: "", page: 1 }, "push");
    }
  });
}
for (const button of setButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.set === imageSet) return;
    imageSet = button.dataset.set;
    render();
    writeLocation("push");
    if (dialog.open && currentEntry) openQr(currentEntry, currentGroup);
  });
}
$("#search").addEventListener("submit", (event) => event.preventDefault());
categorySelect.addEventListener("change", () => setState({ category: categorySelect.value, page: 1 }, "push"));
queryInput.addEventListener("input", (event) => {
  if (!event.isComposing) setState({ query: queryInput.value, page: 1 });
});
queryInput.addEventListener("compositionend", () => setState({ query: queryInput.value, page: 1 }));
clearSearch.addEventListener("click", () => {
  setState({ query: "", page: 1 });
  queryInput.focus();
});
$("#reset").addEventListener("click", () => {
  setState({ query: "", category: "all", page: 1 }, "push");
  queryInput.focus();
});
$("#prev-page").addEventListener("click", () => changePage(-1));
$("#next-page").addEventListener("click", () => changePage(1));
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#easy-mode").addEventListener("click", enterScan);
scan.addEventListener("click", exitScan);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !scan.hidden) exitScan();
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && !scan.hidden) exitScan();
});
$("#show-prereq").addEventListener("click", () => {
  dialog.close();
  prereq.open = true;
  prereq.scrollIntoView({ block: "start" });
  prereqSummary.focus({ preventScroll: true });
});
$("#show-trouble").addEventListener("click", () => {
  dialog.close();
  trouble.open = true;
  trouble.scrollIntoView({ block: "start" });
  trouble.querySelector("summary").focus({ preventScroll: true });
});
dialog.addEventListener("close", () => {
  if (!dialog.open) qrDisplay.replaceChildren();
});
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
window.addEventListener("hashchange", () => {
  if (dialog.open) dialog.close();
  state = readLocation();
  render();
});

render();
