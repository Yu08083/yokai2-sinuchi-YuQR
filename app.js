"use strict";

const { items, yokai, bosses, categories, tribes } = window.qrCatalog;
const groups = { item: items, yokai, boss: bosses };
const folders = { item: "item", yokai: "yokai", boss: "boss_dex" };
const setFolders = { male: "tinko", female: "manko" };
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
  return `${setFolders[imageSet]}/${folders[group]}/${encodeURIComponent(filename)}`;
}

function sortNames(a, b) {
  return collator.compare(a.name, b.name);
}

function entryMeta(entry, group) {
  if (group === "item") return categories[entry.category];
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
    if (group !== "item" && /^(?:no)?\d{1,3}$/.test(term)) {
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

  $("#section-title").textContent = { item: "アイテム", yokai: "妖怪", boss: "ボス" }[tab];
  $("#item-filters").hidden = !isItem;
  queryInput.placeholder = isItem ? "アイテム名で検索"
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
    : tab === "boss" ? "図鑑番号順（図鑑登録のみ）" : "大辞典順";
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

function enterScan() {
  if (!currentEntry) return;
  const url = imageUrl(currentGroup, currentEntry.images[currentIndex]);
  scanCode.style.backgroundImage = `url("${url}")`;
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
