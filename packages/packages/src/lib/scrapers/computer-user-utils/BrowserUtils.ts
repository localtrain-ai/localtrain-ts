import { chromium, Browser, Page } from 'playwright';

export async function initBrowserContext(): Promise<Browser> {
  const browser = await chromium.launch();
  const browserContext = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  await browserContext.setExtraHTTPHeaders({
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-IN,en;q=0.9',
    dnt: '1',
    priority: 'u=0, i',
    'sec-ch-ua':
      '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': 'macOS',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });
  return browser;
}

export async function navigateWithRetries(
  page: Page,
  url: string,
  retries = 3
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response) return;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed. Retrying...`);
      await page.waitForTimeout(2000);
    }
  }
  throw new Error(`Failed to load ${url} after ${retries} attempts`);
}
