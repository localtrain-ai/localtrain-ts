import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface ScreenshotResult {
  buffer: Buffer;
}

export async function captureScreenshot(page: Page): Promise<ScreenshotResult> {

  // Take screenshot with labeled elements
  const screenshotBuffer = await page.screenshot();

  // Store screenshot for debugging
  await storeScreenshot(screenshotBuffer, page.url());

  return {
    buffer: screenshotBuffer
  };
}

export async function storeScreenshot(
  buffer: Buffer,
  url: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const urlHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');
  const fileName = `${timestamp}-${urlHostname}.png`;
  const filePath = path.join(__dirname, 'screenshots', fileName);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buffer);
}
