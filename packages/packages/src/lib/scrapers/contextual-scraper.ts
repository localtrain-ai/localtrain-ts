import { IBaseSupportedInputs, ScraperProvider } from '@localtrain.ai/core';
import {
  ContextDTO,
  StepInputDTO,
  StepOutputDTO,
} from '@localtrain.ai/core';
import * as puppeteer from 'puppeteer'; // Puppeteer to interact with and scrape JavaScript-rendered content

function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

export const validateURL = (url: string): boolean => {
  return /^(?:(?:(?:https?):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
    url
  );
};

interface ElementDetails {
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  src: string;
  href: string;
}

interface StructuredContentNode {
  element: ElementDetails | null;
  children?: StructuredContentNode[] | null;
}

interface Metadata {
  title: string;
  description: string;
  keywords: string[];
}

interface ExtractedContent {
  metadata: Metadata;
  structuredContent: StructuredContentNode | null;
}

export class ContextualScraper extends ScraperProvider {
  key = 'contextual-scraper';
  description =
    'Uses Puppeteer to scrape dynamically rendered content from a URL and extracts key SEO elements like metadata, headers, images, and links.';
  providerKey = 'scraper';
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: 'input',
      label: 'URL',
      name: "url",
      description: 'The URL to scrape the data',
    }
  ];

  protected cleanUrl(rawUrl: string): string {
    try {
      // Parse the raw URL
      const url = new URL(rawUrl);

      // Encode the pathname
      url.pathname = encodeURI(url.pathname);

      // Encode each query parameter key and value
      url.search = Array.from(url.searchParams.entries())
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      // Return the fully encoded URL
      return url.toString();
    } catch (error) {
      console.error('Error cleaning URL:', error);
      return rawUrl; // Return the original URL if an error occurs
    }
  }

  async execute(
    input: StepInputDTO<any>,
    context: ContextDTO
  ): Promise<StepOutputDTO<any>> {
    const url = this.cleanUrl(input.inputs.url);

    if (!validateURL(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    console.debug(`Navigating ${url}`);
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
    await page.setUserAgent(ua);
    // await page.setExtraHTTPHeaders({
    //   accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    //   "accept-encoding": "gzip, deflate, br, zstd",
    //   "accept-language": "en-IN,en;q=0.9",
    //   dnt: "1",
    //   priority: "u=0, i",
    //   "sec-ch-ua": "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
    //   "sec-ch-ua-mobile": "?0",
    //   "sec-ch-ua-platform": "\"macOS\"",
    //   "sec-fetch-dest": "document",
    //   "sec-fetch-mode": "navigate",
    //   "sec-fetch-site": "none",
    //   "sec-fetch-user": "?1",
    //   "upgrade-insecure-requests": "1"
    // })
    const resposne = await page.goto(url, { waitUntil: 'networkidle2' });
    if(!resposne) {
      throw new Error(`Could not resolve response`);
    }
    // await delay(3000);
    // await page.$eval('button.yt-spec-button-shape-next.yt-spec-button-shape-next--outline.yt-spec-button-shape-next--call-to-action.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--enable-backdrop-filter-experiment', (elem) => {
    //   console.log('elem', elem);
    //   if(elem) {
    //     elem.click()
    //   }
    // })
    // await delay(3000);
    console.log('Response status from scraper', resposne.status());
    // const text = await page.evaluate(() =>
    //   Array.from(
    //     document.querySelectorAll('.segment-text.style-scope.ytd-transcript-segment-renderer'),
    //     (element) => element.textContent
    //   )
    // );
    //
    // console.log('text', text.join());

    const output: any = {};
    output.metadata = await this.extractMetadata(page);
    // output.headers = await this.extractHeaders(page);
    // output.images = await this.extractImages(page);
    output.links = await this.extractLinks(page);
    output.text = await this.extractText(page);
    // // output.tables = await this.extractTables(page);
    // output.buttons = await this.extractButtons(page);
    // output.viewport = await this.extractViewport(page);
    // // output.loadAssets = await this.extractLoadAssets(page);
    // output.domRepresentation = await this.createHierarchicalDomRepresentation(page);
    output.domTextRepresentation = await this.createCondensedDomRepresentation(page);
    // output.html = await page.content();
    // output.screenshot = await this.captureScreenshot(page);
    // output.extractStructuredContent = await this.extractStructuredContent(page);

    await browser.close();

    return {
      output,
      timestamp: new Date(),
      timeTaken: 0,
      context
    } as StepOutputDTO<any>;
  }

  // private async captureScreenshot(page: puppeteer.Page): Promise<string> {
  //   // Capture a full-page screenshot and return as a base64-encoded string with 'data:image/png;base64,' prefix
  //   const screenshotBuffer = await page.screenshot({ fullPage: true, encoding: "base64" });
  //   return `data:image/png;base64,${screenshotBuffer}`;
  // }

  private async extractStructuredContent(page: puppeteer.Page): Promise<ExtractedContent> {
    try {
      return await page.evaluate(() => {
        function extractElementDetails(element: Element): ElementDetails | null {
          try {
            const tag = element.tagName.toLowerCase();
            const textContent = element.textContent?.trim().slice(0, 50) || ''; // Limit text length
            const src = element.getAttribute('src') || '';
            const href = element.getAttribute('href') || '';

            return {
              tag,
              id: element.id || null,
              classes: element.className ? element.className.split(' ').slice(0, 2) : [], // Limit classes
              text: textContent,
              src,
              href,
            };
          } catch (error) {
            console.error(`Error extracting details from element: ${error}`);
            return null; // Return null if extraction fails
          }
        }

        function extractContent(node: Element, depth = 0, maxDepth = 5): StructuredContentNode | null {
          if (depth > maxDepth) return null; // Stop recursion if max depth reached

          if (node.tagName.toLowerCase() === 'script' || node.tagName.toLowerCase() === 'iframe') {
            return null;
          }

          const element = extractElementDetails(node);
          if (!element) return null; // Skip if element extraction fails

          const children: StructuredContentNode[] | null = Array.from(node.children)
            .map((child) => extractContent(child, depth + 1, maxDepth))
            .filter((child): child is StructuredContentNode => child !== null);

          return {
            element,
            children: children.length > 0 ? children : undefined,
          };
        }

        try {
          const title = document.title.slice(0, 30) || 'No title available';
          const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.slice(0, 60) || 'No description';
          const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').slice(0, 5) || [];

          return {
            metadata: { title, description, keywords },
            structuredContent: extractContent(document.body),
          };
        } catch (error) {
          console.error(`Error extracting metadata or content: ${error}`);
          return {
            metadata: {
              title: 'Error retrieving title',
              description: 'Error retrieving description',
              keywords: [],
            },
            structuredContent: null,
          };
        }
      });
    } catch (error) {
      console.error(`Error during Puppeteer page evaluation: ${error}`);
      return {
        metadata: {
          title: 'Page load error',
          description: 'Failed to load or process page',
          keywords: [],
        },
        structuredContent: null,
      };
    }
  }

  private async extractMetadata(page: puppeteer.Page): Promise<any> {
    return await page.evaluate(() => {
      const title = document.querySelector('title')?.innerText || '';
      const metaDescription =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') || '';
      const keywords =
        document
          .querySelector('meta[name="keywords"]')
          ?.getAttribute('content') || '';
      return { title, metaDescription, keywords };
    });
  }

  private async extractHeaders(page: puppeteer.Page): Promise<any> {
    return await page.evaluate(() => {
      const headers: Record<string, any> = {};
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag) => {
        headers[tag] = Array.from(document.querySelectorAll(tag)).map(
          (header) => header.textContent?.trim() || ''
        );
      });
      return headers;
    });
  }

  private async extractImages(page: puppeteer.Page): Promise<any> {
    return await page.$$eval('img', (images) =>
      images.map((img) => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
      }))
    );
  }

  private async extractViewport(page: puppeteer.Page): Promise<any> {
    const viewportMeta = await page.$('meta[name="viewport"]');
    if (viewportMeta) {
      const content = await viewportMeta.getProperty('content');
      return { viewport: await content.jsonValue() };
    }
    return { viewport: 'Not specified' };
  }

  private async extractLoadAssets(page: puppeteer.Page): Promise<any> {
    const assets = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('link[rel="stylesheet"], script[src], img')
      )
        .map((element) => {
          if (element.tagName === 'LINK') {
            return { type: 'stylesheet', src: element.getAttribute('href') };
          } else if (element.tagName === 'SCRIPT') {
            return { type: 'script', src: element.getAttribute('src') };
          } else if (element.tagName === 'IMG') {
            return { type: 'image', src: element.getAttribute('src') };
          }
          return null;
        })
        .filter(Boolean);
    });
    return { assets };
  }

  private async extractLinks(
    page: puppeteer.Page
  ): Promise<{ href: string; text: string }[]> {
    // Get the base URL of the page to resolve relative URLs
    const pageUrl = page.url();

    return await page.$$eval(
      'a',
      (anchors, baseUrl) =>
        anchors
          .map((anchor) => {
            const href = anchor.getAttribute('href');
            const text = anchor.textContent?.trim() || '';

            // If href is a relative URL, convert it to an absolute URL
            const absoluteHref = href ? new URL(href, baseUrl).href : '';

            return { href: absoluteHref, text };
          })
          .filter((link) => link.href), // Filter out empty hrefs
      pageUrl // Pass page's URL as the base URL for resolving relative paths
    );
  }

  private async createCondensedDomRepresentation(
    page: puppeteer.Page
  ): Promise<string> {
    // Begin traversal from the document body with no depth or child count limits
    const result = await page.evaluate(() => {
      function traverse(node: Element, depth: number) {
        const tag = node.tagName.toLowerCase();
        if (['script','iframe', 'svg'].includes(tag)) {
          return ''; // Skip svg and iframe elements
        }
        const id = node.id ? `#${node.id}` : '';
        const className = node.className
          ? `.${Array.from(node.classList).join('.')}`
          : '';
        const textContent = node.textContent?.trim().slice(0, 50) || ''; // Limit text content

        // Handle images and links specifically
        let line = `${'  '.repeat(depth)}<${tag}${id}>`;

        if (tag === 'img') {
          const src = node.getAttribute('src') || '';
          line += ` [src="${src}"]`;
        } else if (tag === 'a') {
          const href = node.getAttribute('href') || '';
          line += ` [href="${href}"]`;
        } else if (textContent) {
          line += `: "${textContent}"`;
        }

        // Collect lines for each child node
        let childLines = '';
        const children = Array.from(node.children); // No limit on children
        for (const child of children) {
          childLines += `\n${traverse(child, depth + 1)}`;
        }
        return line + childLines;
      }

      return traverse(document.body, 0); // Start from the body
    });

    return result;
  }

  /**
   * Extract text from headings and paragraph tags.
   * @param page Puppeteer Page instance
   * @returns Array of text content
   */
  private async extractText(page: puppeteer.Page): Promise<string[]> {
    return await page.$$eval('p, h1, h2, h3, h4, h5, h6, span, a, li, div', (elements) => {
      // Use a Set to store unique text content
      const uniqueTexts = new Set<string>();

      elements.forEach((element) => {
        // Check if element is visible
        const style = window.getComputedStyle(element);
        if (style && style.display !== 'none' && style.visibility !== 'hidden') {
          // Clean and add non-empty text content to Set
          const text = element.textContent?.trim();
          if (text) {
            uniqueTexts.add(text);
          }
        }
      });

      // Return as an array
      return Array.from(uniqueTexts);
    });
  }

  /**
   * Extract button text from the page.
   * @param page Puppeteer Page instance
   * @returns Array of button text content
   */
  private async extractButtons(page: puppeteer.Page): Promise<string[]> {
    return await page.$$eval('button', (buttons) =>
      buttons.map((button) => button.textContent?.trim() || '').filter(Boolean)
    );
  }

  /**
   * Extract tables from the page.
   * @param page Puppeteer Page instance
   * @returns Array of table data
   */
  private async extractTables(page: puppeteer.Page): Promise<any[]> {
    return await page.$$eval('table', (tables) =>
      tables.map((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          return cells.map((cell) => cell.textContent?.trim() || '');
        });
      })
    );
  }

  private async createHierarchicalDomRepresentation(
    page: puppeteer.Page
  ): Promise<any> {
    // Begin traversal from the document body
    const rootNode = await page.evaluate(() => {
      function traverse(node: Element) {
        // Only include relevant details to minimize the payload size
        const element = {
          tagName: node.tagName, // e.g., DIV, P, H1
          id: node.id || null,
          className: node.className || null,
          textContent: node.textContent?.trim().slice(0, 100) || '', // Limit text for cost-efficiency
          children: [], // Child nodes will be added here
        };

        // Recursively capture children if present
        for (let i = 0; i < node.children.length; i++) {
          const childNode: any = traverse(node.children[i]);
          // @ts-ignore
          element.children.push(childNode);
        }

        return element;
      }

      // Start traversal from <body> to avoid unnecessary nodes like <head> or <script>
      return traverse(document.body);
    });

    return rootNode;
  }

  /**
   * Get progress of the step (placeholder for future enhancements).
   * @param stepData The scraped content
   * @returns A static progress value for now
   */
  getProgress(stepData: any): number {
    return 100; // Placeholder: Progress tracking could be enhanced for long-running scrapes.
  }
}
