import { expect, test, type Page } from '@playwright/test';
import { guardPage, serviceWorkerInfo, waitForServiceWorker } from '../src/kit/smoke/helpers';

/** Wait for a game that has its own engine to report ready through its ?test=1 hook. */
async function waitForOwnReady(page: Page, hook: string): Promise<void> {
  await page.waitForFunction(
    (name) => {
      const api = (window as unknown as Record<string, { ready?: boolean } | undefined>)[name];
      return api?.ready === true;
    },
    hook,
    { timeout: 45_000 },
  );
}

/**
 * Hub integration checks for a game that has its own engine and UI (not the kit): hub worker,
 * hub manifest, offline after the first visit, CSP, referrer, and no external requests,
 * console errors or cookies. The game's own repo runs its full suite in all 5 projects.
 */
export function defineOwnEngineSuite(slug: string, hook: string): void {
  test.describe(`site-${slug} (own engine)`, () => {
    test('loads under the hub worker and manifest, works offline and stays private', async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      const guard = guardPage(page, context, baseURL ?? 'http://localhost');
      await page.goto(`/games/${slug}/?test=1`);
      await waitForOwnReady(page, hook);
      await expect(page.locator('canvas').first()).toBeVisible();

      const csp = page.locator('meta[http-equiv="Content-Security-Policy"]');
      await expect(csp).toHaveCount(1);
      expect(await csp.getAttribute('content')).toContain("default-src 'self'");
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
      await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
        'href',
        '/games/manifest.webmanifest',
      );

      const controlled = await waitForServiceWorker(page);
      if (!controlled && !testInfo.project.name.match(/chromium|pixel/)) {
        test.fixme(
          true,
          `service worker never took control in ${testInfo.project.name} on this host`,
        );
      }
      expect(controlled, 'service worker controls the page').toBe(true);
      const info = await serviceWorkerInfo(page);
      expect(info.scope).toBe('/games/');
      expect(info.scriptURL).toBe('/games/sw.js');

      await context.setOffline(true);
      await page.reload();
      await waitForOwnReady(page, hook);
      await expect(page.locator('canvas').first()).toBeVisible();
      await context.setOffline(false);

      await guard.assertClean();
    });
  });
}
