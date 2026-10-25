/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.css';

declare module '*.ttf' {
  const value: string;
  export default value;
}

declare module '*.otf' {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}
