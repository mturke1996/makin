/** One active focus scope for nested portal dialogs. Background attributes are restored exactly. */
type Scope = { root: HTMLElement; panel: HTMLElement; previous: HTMLElement | null };
const scopes: Scope[] = [];
const disabled = new Map<HTMLElement, { inert: boolean; aria: string | null }>();
const selector = 'button, a[href], input, textarea, select, [tabindex], [contenteditable="true"]';

function focusable(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(selector)].filter(element =>
    element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden',
  );
}

function restoreBackground() {
  for (const [element, prior] of disabled) {
    element.inert = prior.inert;
    if (prior.aria === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', prior.aria);
  }
  disabled.clear();
}

function syncBackground() {
  restoreBackground();
  const top = scopes[scopes.length - 1];
  if (!top) return;
  // Focus must leave the old scope before that scope becomes aria-hidden.
  if (!top.panel.contains(document.activeElement)) top.panel.focus({ preventScroll: true });
  for (const element of document.body.children) {
    if (!(element instanceof HTMLElement) || element === top.root || element.contains(top.root)) continue;
    if (['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)) continue;
    disabled.set(element, { inert: !!element.inert, aria: element.getAttribute('aria-hidden') });
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
  }
}

function onFocus(event: FocusEvent) {
  const top = scopes[scopes.length - 1];
  if (top && event.target instanceof Node && !top.panel.contains(event.target)) {
    (focusable(top.panel)[0] ?? top.panel).focus({ preventScroll: true });
  }
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Tab') return;
  const top = scopes[scopes.length - 1];
  if (!top) return;
  const elements = focusable(top.panel);
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement;
  if (!first) { event.preventDefault(); top.panel.focus(); return; }
  if (event.shiftKey && (active === first || active === top.panel || !top.panel.contains(active))) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && (active === last || !top.panel.contains(active))) {
    event.preventDefault(); first.focus();
  }
}

export function activateModalFocus(root: HTMLElement, panel: HTMLElement): () => void {
  const scope: Scope = { root, panel, previous: document.activeElement instanceof HTMLElement ? document.activeElement : null };
  scopes.push(scope);
  if (scopes.length === 1) {
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus, true);
  }
  syncBackground();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const wasTop = scopes[scopes.length - 1] === scope;
    scopes.splice(scopes.indexOf(scope), 1);
    syncBackground();
    if (!scopes.length) {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
    }
    if (wasTop && scope.previous?.isConnected && !scope.previous.closest('[inert]')) {
      const top = scopes[scopes.length - 1];
      if (!top || top.panel.contains(scope.previous)) scope.previous.focus({ preventScroll: true });
    }
  };
}
