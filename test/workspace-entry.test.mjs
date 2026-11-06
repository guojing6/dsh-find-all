import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { installWorkspaceEntry, isWorkspaceSearchShortcut, hasOpenDialog, redirectExpandedHostSearch } from "../src/workspace-entry.js";

function addHeader(document, label = "搜索会话") {
  const header = document.createElement("div");
  header.className = "GAkraW_sectionHeader";
  header.innerHTML = [
    '<span class="GAkraW_sectionLabel">工作区</span>',
    '<div class="GAkraW_searchSlot"><div class="GAkraW_search"><button type="button" aria-label="' + label + '">search</button><input type="text"></div></div>',
    '<div class="GAkraW_headerActions"><button type="button" aria-label="more">more</button></div>',
  ].join("");
  document.body.append(header);
  return header;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

test("replaces the search button inside its existing slot without moving the header", async () => {
  const { document, MouseEvent } = new JSDOM("<!doctype html><body></body>").window;
  let opened = 0;
  const stop = installWorkspaceEntry(document, () => { opened += 1; }, "对话全文搜索", "对话全文搜索 (Ctrl+K)");
  const header = addHeader(document);
  await tick();
  const slot = header.querySelector(".GAkraW_searchSlot");
  const container = header.querySelector(".GAkraW_search");
  const entry = container.querySelector("[data-find-all-workspace-entry]");
  assert.ok(entry, "entry mounted next to the host button");
  assert.equal(entry.parentElement, container);
  assert.equal(entry.getAttribute("aria-label"), "对话全文搜索");
  assert.equal(entry.title, "对话全文搜索 (Ctrl+K)");
  assert.equal(header.querySelector('button[aria-label="搜索会话"]').style.display, "none");
  assert.notEqual(slot.style.display, "none", "the search slot keeps its layout box");
  assert.equal(header.firstElementChild.className, "GAkraW_sectionLabel", "the section label stays first");
  entry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  assert.equal(opened, 1);

  // A second header re-rendered by the Host receives its own entry.
  const second = addHeader(document, "Search sessions");
  await tick();
  assert.equal(document.querySelectorAll("[data-find-all-workspace-entry]").length, 2);
  assert.ok(second.querySelector("[data-find-all-workspace-entry]"));
  stop();
  assert.equal(document.querySelectorAll("[data-find-all-workspace-entry]").length, 0);
  assert.equal(header.querySelector('button[aria-label="搜索会话"]').style.display, "");
  assert.equal(second.querySelector('button[aria-label="Search sessions"]').style.display, "");
});

test("rail mode replaces the container search button without a section header", async () => {
  const { document, MouseEvent } = new JSDOM("<!doctype html><body></body>").window;
  let opened = 0;
  const stop = installWorkspaceEntry(document, () => { opened += 1; }, "对话全文搜索");
  const rail = document.createElement("div");
  rail.className = "GAkraW_root GAkraW_rail";
  rail.innerHTML = '<div class="GAkraW_search"><button type="button" aria-label="搜索会话">search</button></div>';
  document.body.append(rail);
  await tick();
  const host = rail.querySelector('button[aria-label="搜索会话"]');
  const entry = rail.querySelector("[data-find-all-workspace-entry]");
  assert.ok(entry);
  assert.equal(entry.parentElement, rail.querySelector(".GAkraW_search"));
  assert.equal(host.style.display, "none");
  entry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  assert.equal(opened, 1);
  stop();
  assert.equal(rail.querySelector("[data-find-all-workspace-entry]"), null);
});

test("host search shortcut chord is recognized without hijacking other modifiers", () => {
  const event = (patch) => ({ defaultPrevented: false, isComposing: false, repeat: false, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, code: "KeyK", ...patch });
  assert.equal(isWorkspaceSearchShortcut(event({ ctrlKey: true })), true);
  assert.equal(isWorkspaceSearchShortcut(event({ metaKey: true })), true);
  assert.equal(isWorkspaceSearchShortcut(event({ ctrlKey: true, altKey: true })), false);
  assert.equal(isWorkspaceSearchShortcut(event({ ctrlKey: true, shiftKey: true })), false);
  assert.equal(isWorkspaceSearchShortcut(event({ ctrlKey: true, repeat: true })), false);
  assert.equal(isWorkspaceSearchShortcut(event({ ctrlKey: true, isComposing: true })), false);
  assert.equal(isWorkspaceSearchShortcut(event({ ctrlKey: true, code: "KeyJ" })), false);
  assert.equal(isWorkspaceSearchShortcut(event({})), false);
  assert.equal(isWorkspaceSearchShortcut(null), false);
});

test("an open Host dialog keeps the shortcut away from the plugin", () => {
  const { document } = new JSDOM('<!doctype html><body><div role="dialog" aria-modal="true"></div></body>').window;
  assert.equal(hasOpenDialog(document), true);
  const { document: empty } = new JSDOM("<!doctype html><body></body>").window;
  assert.equal(hasOpenDialog(empty), false);
});

test("desktop-style host search expansion is collapsed and redirected", () => {
  const { document } = new JSDOM('<!doctype html><body><div class="GAkraW_searchSlot GAkraW_searchSlotExpanded"><input></div></body>').window;
  const input = document.querySelector("input");
  let escaped = 0, opened = 0;
  input.addEventListener("keydown", (event) => { if (event.key === "Escape") escaped += 1; });
  assert.equal(redirectExpandedHostSearch(document, () => false, () => { opened += 1; }), true);
  assert.equal(escaped, 1);
  assert.equal(opened, 1);
  assert.equal(redirectExpandedHostSearch(document, () => true, () => { opened += 1; }), false);
  assert.equal(opened, 1);
});

test("installer redirects a host-expanded search observed after mount", async () => {
  const { document } = new JSDOM("<!doctype html><body></body>").window;
  let opened = 0;
  const stop = installWorkspaceEntry(document, () => { opened += 1; }, "对话全文搜索");
  const header = addHeader(document);
  await tick();
  const slot = header.querySelector(".GAkraW_searchSlot");
  slot.classList.add("GAkraW_searchSlotExpanded");
  await tick();
  assert.equal(opened, 1);
  stop();
});

test("every 0.2.2-rc.1 host locale replaces the search button, not just zh/en", async () => {
  const { document } = new JSDOM("<!doctype html><body></body>").window;
  const stop = installWorkspaceEntry(document, () => {}, "对话全文搜索");
  const labels = ["セッションを検索", "Buscar sesiones", "Rechercher des sessions", "Sitzungen suchen", "Поиск сеансов", "Buscar sessões"];
  const headers = labels.map((label) => addHeader(document, label));
  await tick();
  assert.equal(document.querySelectorAll("[data-find-all-workspace-entry]").length, labels.length);
  for (let index = 0; index < headers.length; index += 1) {
    assert.equal(headers[index].querySelector(`button[aria-label="${labels[index]}"]`).style.display, "none");
  }
  stop();
});
