import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { installWorkspaceEntry, isWorkspaceSearchShortcut, hasOpenDialog } from "../src/workspace-entry.js";

function addHeader(document, label = "搜索会话", withActions = true) {
  const header = document.createElement("div");
  header.className = "GAkraW_sectionHeader";
  header.innerHTML = [
    '<span class="GAkraW_sectionLabel">工作区</span>',
    '<div class="GAkraW_searchSlot"><button type="button" aria-label="' + label + '">search</button></div>',
    withActions ? '<div class="GAkraW_headerActions"><button type="button" aria-label="more">more</button></div>' : "",
  ].join("");
  document.body.append(header);
  return header;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

test("replaces the current-host Workspaces search button in place", async () => {
  const { document, MouseEvent } = new JSDOM("<!doctype html><body></body>").window;
  let opened = 0;
  const stop = installWorkspaceEntry(document, () => { opened += 1; }, "对话全文搜索", "对话全文搜索 (Ctrl+K)");
  const first = addHeader(document);
  await tick();
  const entry = first.querySelector("[data-find-all-workspace-entry]");
  assert.ok(entry, "entry mounted after the header appeared");
  assert.equal(entry.getAttribute("aria-label"), "对话全文搜索");
  assert.equal(entry.title, "对话全文搜索 (Ctrl+K)");
  assert.equal(entry.nextElementSibling.className, "GAkraW_headerActions");
  assert.equal(first.querySelector('button[aria-label="搜索会话"]').style.display, "none");
  assert.equal(first.querySelector(".GAkraW_searchSlot").style.display, "none");
  entry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  assert.equal(opened, 1);

  // A second header re-rendered by the Host receives its own entry.
  const second = addHeader(document, "Search sessions", false);
  await tick();
  assert.equal(document.querySelectorAll("[data-find-all-workspace-entry]").length, 2);
  assert.equal(second.lastElementChild.hasAttribute("data-find-all-workspace-entry"), true);
  stop();
  assert.equal(document.querySelectorAll("[data-find-all-workspace-entry]").length, 0);
  assert.equal(first.querySelector('button[aria-label="搜索会话"]').style.display, "");
  assert.equal(second.querySelector('button[aria-label="Search sessions"]').style.display, "");
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

test("rail mode replaces the container search button without a section header", async () => {
  const { document, MouseEvent } = new JSDOM("<!doctype html><body></body>").window;
  let opened = 0;
  const stop = installWorkspaceEntry(document, () => { opened += 1; }, "对话全文搜索");
  const rail = document.createElement("div");
  rail.innerHTML = '<div class="GAkraW_search"><button type="button" aria-label="搜索会话">search</button></div>';
  document.body.append(rail);
  await tick();
  const host = rail.querySelector('button[aria-label="搜索会话"]');
  const entry = rail.querySelector("[data-find-all-workspace-entry]");
  assert.ok(entry);
  assert.equal(host.style.display, "none");
  entry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  assert.equal(opened, 1);
  stop();
  assert.equal(rail.querySelector("[data-find-all-workspace-entry]"), null);
});

test("an open Host dialog keeps the shortcut away from the plugin", () => {
  const { document } = new JSDOM('<!doctype html><body><div role="dialog" aria-modal="true"></div></body>').window;
  assert.equal(hasOpenDialog(document), true);
  const { document: empty } = new JSDOM("<!doctype html><body></body>").window;
  assert.equal(hasOpenDialog(empty), false);
});
