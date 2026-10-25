/** After a failed submit: put the cursor on the first invalid field of the open dialog, so an error below the fold is not missed. */
export function focusFirstInvalid(): void {
  requestAnimationFrame(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    dialogs[dialogs.length - 1]?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
