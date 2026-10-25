// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { activateModalFocus } from './modalFocus';

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.reverse().forEach(dispose => dispose()); cleanup.length = 0; document.body.innerHTML = ''; });
function dialog(id: string) {
  const root = document.createElement('div');
  root.innerHTML = `<div tabindex="-1" id="${id}"><button>First</button><input/><button>Last</button></div>`;
  document.body.append(root);
  const panel = root.firstElementChild as HTMLElement;
  const buttons = panel.querySelectorAll('button');
  cleanup.push(activateModalFocus(root, panel));
  return { root, panel, first: buttons[0], last: buttons[1] };
}
function tab(shiftKey = false) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })); }

describe('nested modal focus', () => {
  it('contains backward and forward tab order, including the initial panel focus', () => {
    const { panel, first, last } = dialog('one');
    expect(document.activeElement).toBe(panel);
    tab(true); expect(document.activeElement).toBe(last);
    tab(); expect(document.activeElement).toBe(first);
  });
  it('deactivates background and older dialogs, then restores the exact prior state and trigger', () => {
    document.body.innerHTML = '<main aria-hidden="false"><button id="trigger">Open</button></main>';
    const main = document.querySelector('main')!;
    const trigger = document.querySelector<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    const first = dialog('one'); first.first.focus();
    const second = dialog('two');
    expect(main.inert).toBe(true); expect(first.root.inert).toBe(true);
    first.first.focus(); expect(document.activeElement).toBe(second.first);
    cleanup.pop()!();
    expect(first.root.inert).toBe(false); expect(document.activeElement).toBe(first.first);
    cleanup.pop()!();
    expect(main.inert).toBe(false); expect(main.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
