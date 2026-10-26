// `virtual:pwa-register` only exists inside the Vite build. Tests alias it here (and replace it with vi.mock where they need to).
export function registerSW(): () => Promise<void> {
  return async () => undefined;
}
