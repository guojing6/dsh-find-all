// The Workspaces section header owns the host's session-search button and the
// Ctrl/Cmd+K shortcut. The current host exposes no Slot for that header, so the
// plugin swaps the button for its own entry in place: the surrounding search
// slot and header layout stay untouched (including the section label's
// position). A coalesced MutationObserver keeps the entry mounted across
// sidebar re-renders and the rail/wide transition.

const HOST_SEARCH_LABELS = ["搜索会话", "Search sessions"];
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
 * Desktop shells consume matched shortcut chords before the page sees them and
 * dispatch the Host command (session.search) instead. When the Host's inline
 * search expands, collapse it and open the plugin surface instead.
 * @returns whether an expanded Host search was redirected.
 */
export function redirectExpandedHostSearch(document, isOpen, open) {
	const slot = document.querySelector('[class*="_searchSlotExpanded"], [class*="_searchExpanded"]');
	if (!slot || isOpen()) return false;
	const input = slot.querySelector("input");
	const view = document.defaultView;
	if (input && view?.KeyboardEvent) {
		input.dispatchEvent(new view.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	}
	open();
	return true;
}

/**
 * Replace the host's Workspaces-header search button with the plugin entry.
 * The entry takes the button's exact place inside the existing search slot, so
 * the header's label/action alignment is unchanged.
 * @param document - host page document.
 * @param open - opens the plugin's full-text search surface.
 * @param label - accessible name for the entry.
 * @param hint - optional tooltip text (defaults to the label).
 * @returns disposer restoring the host button and removing injected nodes.
 */
export function installWorkspaceEntry(document, open, label, hint = label, isOpen = () => false) {
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

	const sync = () => {
		if (disposed) return;
		for (const host of document.querySelectorAll(HOST_SEARCH_LABELS.map((name) => `button[aria-label="${name}"]`).join(","))) {
			if (!host.isConnected) continue;
			hide(host);
			// The host button is the only child that should be replaced; the
			// wrapping search slot keeps its size and click-to-expand geometry.
			const container = host.parentElement;
			if (!container || container.querySelector(`[${ENTRY}]`)) continue;
			container.insertBefore(button(), host);
		}
		redirectExpandedHostSearch(document, isOpen, open);
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
	observer?.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
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
