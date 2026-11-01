// The Workspaces section header owns the host's session-search button and the
// Ctrl/Cmd+K shortcut. The current host exposes no Slot for that header, so the
// plugin replaces the button in place and takes over the shortcut. Every anchor
// is version-pinned to the supported host; mutation observation keeps the entry
// mounted across sidebar re-renders and the rail/wide transition.

const HOST_SEARCH_LABELS = ["搜索会话", "Search sessions"];
const HEADER = '[class*="_sectionHeader"]';
const HEADER_ACTIONS = '[class*="_headerActions"]';
const SEARCH_SLOT = '[class*="_searchSlot"]';
const ENTRY = "data-find-all-workspace-entry";

const STYLE = [
	".dsh-find-all-workspace-entry{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}",
	".dsh-find-all-workspace-entry:hover{background:var(--dsw-alias-interactive-bg-hover)}",
	".dsh-find-all-workspace-entry:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
	'[class*="_rail"] .dsh-find-all-workspace-entry{width:36px;height:36px;border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-primary)}',
].join("\n");

const ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path></svg>';

/** Whether this keydown is the host's session-search chord (Ctrl/Cmd+K). */
export function isWorkspaceSearchShortcut(event) {
	if (!event || event.defaultPrevented || event.isComposing || event.repeat) return false;
	if (event.altKey || event.shiftKey) return false;
	if (!(event.ctrlKey || event.metaKey)) return false;
	return event.code === "KeyK";
}

/** Whether a page dialog already owns the keyboard (never stack our search over it). */
export function hasOpenDialog(document) {
	try {
		return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
	} catch {
		return false;
	}
}

/**
 * Replace the host's Workspaces-header search button with the plugin entry.
 * @param document - host page document.
 * @param open - opens the plugin's full-text search surface.
 * @param label - accessible name for the entry.
 * @param hint - optional tooltip text (defaults to the label).
 * @returns disposer restoring the host button and removing injected nodes.
 */
export function installWorkspaceEntry(document, open, label, hint = label) {
	const view = document.defaultView;
	const style = document.createElement("style");
	style.setAttribute("data-find-all-workspace-style", "");
	style.textContent = STYLE;
	document.head.append(style);

	const hidden = new Map();
	let disposed = false;

	const hide = (node) => {
		if (!node || hidden.has(node)) return;
		hidden.set(node, node.style.display);
		node.style.display = "none";
	};

	const button = () => {
		const entry = document.createElement("button");
		entry.type = "button";
		entry.className = "dsh-find-all-workspace-entry";
		entry.setAttribute(ENTRY, "");
		entry.setAttribute("aria-label", label);
		entry.title = hint;
		entry.innerHTML = ICON;
		entry.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			open();
		});
		return entry;
	};

	const ensure = (parent, before) => {
		if (parent.querySelector(`[${ENTRY}]`)) return;
		const entry = button();
		if (before && before.parentElement === parent) parent.insertBefore(entry, before);
		else parent.append(entry);
	};

	const sync = () => {
		if (disposed) return;
		for (const host of document.querySelectorAll(HOST_SEARCH_LABELS.map((name) => `button[aria-label="${name}"]`).join(","))) {
			if (!host.isConnected) continue;
			hide(host);
			// Start above the button: its own class also contains "_search".
			const slot = host.parentElement?.closest(SEARCH_SLOT);
			if (slot) hide(slot);
			const header = host.closest(HEADER);
			if (header) {
				// Wide sidebar: the header keeps its right-aligned actions row.
				slot?.querySelectorAll(`[${ENTRY}]`).forEach((node) => node.remove());
				ensure(header, header.querySelector(HEADER_ACTIONS));
				continue;
			}
			// Rail sidebar: the host renders the search button inside its own
			// click-to-expand container with no section header.
			const rail = host.parentElement?.closest('[class*="_search"]');
			if (rail && !rail.querySelector(`[${ENTRY}]`)) ensure(rail);
		}
	};

	// Coalesce re-renders: streaming single mutations would otherwise run the
	// selector sweep once per DOM change.
	let scheduled = false;
	const schedule = () => {
		if (scheduled || disposed) return;
		scheduled = true;
		(view?.setTimeout ?? setTimeout)(() => {
			scheduled = false;
			sync();
		}, 0);
	};
	const observer = view?.MutationObserver ? new view.MutationObserver(schedule) : null;
	observer?.observe(document.documentElement, { childList: true, subtree: true });
	sync();

	return () => {
		if (disposed) return;
		disposed = true;
		scheduled = false;
		observer?.disconnect();
		for (const entry of document.querySelectorAll(`[${ENTRY}]`)) entry.remove();
		style.remove();
		for (const [node, display] of hidden) node.style.display = display;
		hidden.clear();
	};
}
