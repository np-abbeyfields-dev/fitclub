/**
 * Global style reset for web to remove default browser styles.
 * Ensures consistent baseline (margin, padding, box-sizing) across the app.
 */
import { Platform } from 'react-native';

const WEB_RESET = `
  html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100%; }
  *, *::before, *::after { box-sizing: border-box; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  button, input, select, textarea { font-family: inherit; font-size: inherit; }
  a { text-decoration: none; color: inherit; }
`;

export function injectWebReset(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const id = 'fitclub-global-reset';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = WEB_RESET;
  document.head.appendChild(style);
}
