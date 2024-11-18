import { ContextAwareScraper } from './context-aware-scraper';
import { Browser, chromium, Page } from 'playwright';
import {
  StepInputDTO,
  StepOutputDTO,
  ContextDTO,
  IBaseSupportedInputs,
} from '@localtrain.ai/core';
import {
  initBrowserContext,
  navigateWithRetries,
} from './computer-user-utils/BrowserUtils';
import { captureScreenshot } from './computer-user-utils/ScreenshotUtils';
import { generatePlan } from './computer-user-utils/PlanGenerator';
import { executePlanActions } from './computer-user-utils/ActionExecutor';

export class ComputerUser extends ContextAwareScraper {
  override key = 'computer-user';
  override description =
    'Automates a task on a web page based on iterative LLM feedback.';
  override providerKey = 'scraper';
  override supportedInputs: IBaseSupportedInputs[] = [
    {
      type: 'input',
      label: 'URL',
      name: 'url',
      description: 'URL of the web page',
    },
    {
      type: 'textarea',
      label: 'Instructions',
      name: 'prompt',
      description: 'Goal description',
    },
  ];

  private state = { completed: false, steps: 0 };

  override async execute(
    input: StepInputDTO<any>,
    context: ContextDTO
  ): Promise<StepOutputDTO<any>> {
    const goal = input.inputs.prompt;
    const url = this.cleanUrl(input.inputs.url);
    const browser = await chromium.launch({
      headless: false, // Make browser visible
      slowMo: 5000, // Slow down actions by 50ms for better visibility
    });

    // Enable Playwright Inspector for debugging
    const browserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    // const browserContext = await initBrowserContext();
    let result: { completed: boolean; retries: number; answer?: string } = {
      completed: false,
      retries: 0,
    };

    try {
      const page = await browserContext.newPage();
      await navigateWithRetries(page, url);
      console.log(`Navigated to ${url}`);

      // Take initial screenshot and generate plan
      // const screenshots = await this.captureScreenshots(page);
      // const domContext = await this.extractPageElements(page);
      // const plan = await generatePlan(goal, screenshots, domContext);

      // if (!plan) throw new Error('Failed to generate initial plan');
      // console.log('Initial plan:', JSON.stringify(plan, null, 2));

      // Execute plan with retries
      result = await executePlanActions(page, goal);
      console.log('Execution result:', JSON.stringify(result, null, 2));

      return {
        output: {
          completed: result.completed,
          answer: result.answer,
          details:
            result.answer ||
            `Goal ${result.completed ? 'accomplished' : 'failed'} with ${
              result.retries
            } retries.`,
        },
        timeTaken: 0,
        context,
      };
    } catch (error) {
      console.error('Error during execution:', error);
      throw error;
    } finally {
      await browserContext.close();
    }
  }

  private async captureScreenshots(
    page: Page,
    numberOfScreenshots = 1
  ): Promise<string[]> {
    const base64Images: string[] = [];
    const viewportHeight = page.viewportSize()?.height || 800;

    for (let i = 0; i < numberOfScreenshots; i++) {
      // Scroll to position
      await page.evaluate(
        (scrollY) => window.scrollTo({ top: scrollY, behavior: 'smooth' }),
        i * viewportHeight
      );

      // Wait for any lazy-loaded content
      await page.waitForTimeout(1000);

      // Capture screenshot with labeled elements
      const { buffer } = await captureScreenshot(page);
      base64Images.push(buffer.toString('base64'));
    }

    return base64Images;
  }

  private async extractPageElements(page: Page): Promise<any[]> {
    return page.evaluate(() =>
      Array.from(document.querySelectorAll('button, input, a')).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 30),
        id: el.id,
        classes: Array.from(el.classList),
        name: (el as HTMLInputElement).name || null,
        href: (el as HTMLAnchorElement).href || null,
      }))
    );
  }
}
