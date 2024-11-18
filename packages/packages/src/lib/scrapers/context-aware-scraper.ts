import { ContextualScraper, validateURL } from './contextual-scraper';
import { chromium, Browser, Page } from 'playwright';
import OpenAI from 'openai';
import {
  StepInputDTO,
  StepOutputDTO,
  ContextDTO,
  IBaseSupportedInputs,
} from '@localtrain.ai/core';
import * as fs from 'fs';
import * as path from 'path';
import {
  ChatCompletionContentPartText,
  ChatCompletionMessage,
} from 'openai/resources/chat/completions';

export class ContextAwareScraper extends ContextualScraper {
  override key = 'context-aware-scraper';
  override description =
    'Uses Playwright to scrape dynamically rendered content from a URL and then performs a contextual extraction of data in markdown using a LLM.';
  override providerKey = 'scraper';
  override supportedInputs: IBaseSupportedInputs[] = [
    {
      type: 'input',
      label: 'URL',
      name: 'url',
      description: 'The URL to scrape the data',
    },
    {
      type: 'textarea',
      label: 'Instructions (Detailed)',
      name: 'prompt',
      description: 'This is the instruction to extract information',
    },
  ];

  protected llmClient: OpenAI;

  constructor() {
    super();
    this.llmClient =
      new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] })
  }

  override async execute(
    input: StepInputDTO<any>,
    context: ContextDTO
  ): Promise<StepOutputDTO<any>> {
    const url = this.cleanUrl(input.inputs.url);

    if (!validateURL(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Launch Playwright with Chromium
    const browser: Browser = await chromium.launch();
    const browserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
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
    const page: Page = await browserContext.newPage();
    console.debug(`Navigating ${url}`);

    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (!response) {
      throw new Error(`Could not resolve response for ${url}`);
    }
    console.log('Response status:', response.status());

    // Capture the page in sections
    const base64Images: string[] = [];
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);

    // Decide on the viewport size and number of sections
    const viewportHeight = page.viewportSize()?.height || 600;
    const numSections = Math.ceil(pageHeight / (viewportHeight * 3));

    console.log('numSections', numSections);
    for (let i = 0; i < numSections; i++) {
      // Scroll to the current section
      await page.evaluate(
        (scrollY) => window.scrollTo(0, scrollY),
        i * viewportHeight
      );
      await page.waitForTimeout(500); // Allow time for scroll to settle

      // Capture the current section
      const screenshotBuffer = await page.screenshot();
      const base64Image = screenshotBuffer.toString('base64');
      console.log(
        `Captured and encoded screenshot for section ${
          i + 1
        } of ${numSections}.`
      );

      // Store the screenshot locally (optional)
      // await this.storeScreenshot(screenshotBuffer, url, i);

      // Collect the base64 image
      base64Images.push(base64Image);
    }

    // Pass all images to the LLM in a single call
    const extractedText = await this.extractStructuredText(
      base64Images,
      input.inputs.prompt
    );
    console.log('Extracted structured text from screenshots.');

    await browser.close();

    return {
      output: { extractedText },
      timestamp: new Date(),
      timeTaken: 0,
      context,
    } as StepOutputDTO<any>;
  }

  private async extractStructuredText(
    base64Images: string[],
    prompt: string
  ): Promise<any> {
    try {
      const messagesContent: any[] = [
        {
          type: 'text',
          text: prompt,
        },
        // Include all images in the content array
        ...base64Images.map((base64Image) => ({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'low', // Set detail level to low
          },
        })),
      ];

      const response = await this.llmClient.chat.completions.create({
        model: 'gpt-4o-mini', // Or any specific GPT-4 Vision model you have access to
        messages: [
          {
            role: 'system',
            content: `Generate the output in structured format. Don't add extra things that you cannot interpret. If you cannot see, just say the image is unclear.`,
          },
          {
            role: 'user',
            content: messagesContent,
          },
        ],
      });
      console.log('Usage:', response.usage);
      return response.choices[0].message?.content; // Retrieve the model's response
    } catch (error) {
      console.error('Error in LLM structured text extraction:', error);
      return null;
    }
  }

  /**
   * Stores a screenshot buffer to the local file system with a timestamped filename.
   * @param buffer - The screenshot buffer to store.
   * @param url - The URL of the page, used in the filename.
   * @param sectionIndex - The index of the section (optional).
   * @returns The file path of the saved screenshot.
   */
  protected async storeScreenshot(
    buffer: Buffer,
    url: string,
    sectionIndex?: number
  ): Promise<string> {
    // Generate a timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlHostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-'); // Sanitize URL
    const sectionPart =
      sectionIndex !== undefined ? `-section${sectionIndex}` : '';
    const fileName = `${timestamp}-${urlHostname}${sectionPart}.png`;

    // Define the storage path (adjust this for S3 in the future)
    const filePath = path.join(__dirname, 'screenshots', fileName);

    // Ensure the 'screenshots' directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write the file to the local file system
    await fs.promises.writeFile(filePath, buffer);

    return filePath;
  }
}
