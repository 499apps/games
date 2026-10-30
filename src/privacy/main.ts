/**
 * Privacy page (/games/privacy/): plain text for parents, the live list of g499: keys on this
 * device and a big hold-to-confirm "clear my data" button. No WebGL here.
 */
import '../kit/styles.css';
import './privacy.css';
import { attachHoldToConfirm } from '../kit/menu';
import { createShell } from '../kit/shell';
import { clearAllUserData } from '../kit/storage';
import { exposeTestApi, markGl, markReady } from '../kit/test-mode';

const shell = createShell({
  title: 'Privacy',
  kind: 'page',
  container: document.body,
  base: import.meta.env.BASE_URL,
  dev: import.meta.env.DEV,
  onClearData: () => renderKeys(),
});

const keysNow = document.getElementById('keys-now');
const status = document.getElementById('clear-status');
const clearButton = document.getElementById('clear-data');

function renderKeys(): void {
  if (!keysNow) return;
  const keys = shell.storage.keys();
  keysNow.textContent = keys.length > 0 ? keys.join(', ') : 'none';
}

if (clearButton) {
  attachHoldToConfirm({
    button: clearButton,
    holdMs: 1200,
    onStart: () => shell.synth.tick(),
    onConfirm: async () => {
      const result = await clearAllUserData(shell.storage);
      shell.synth.reload();
      shell.menu.refresh();
      renderKeys();
      if (status) {
        status.textContent =
          result.keysRemoved === 1 ? 'Done. 1 item removed.' : `Done. ${result.keysRemoved} items removed.`;
      }
      shell.synth.success();
    },
  });
}

// Keep the list honest when another tab changes storage.
window.addEventListener('storage', () => renderKeys());

renderKeys();
exposeTestApi({ state: () => ({ keys: shell.storage.keys() }) });
markGl(false);
markReady();
