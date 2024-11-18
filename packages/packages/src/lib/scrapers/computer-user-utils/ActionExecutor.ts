// ActionExecutor.ts

import { ElementHandle, Page } from 'playwright';
import { PlanAction, LLMResponse } from './LLMSchema';
import { captureScreenshot } from './ScreenshotUtils';
import { generatePlan } from './PlanGenerator';
import { ElementLabeler } from './ElementLabeler';

interface ExecutionResult {
  completed: boolean;
  retries: number;
  answer?: string;
}

interface ActionContext {
  previousActions: {
    action: PlanAction;
    timestamp: number;
    url: string;
  }[];
  currentUrl: string;
}

export async function executePlanActions(
  page: Page,
  goal: string,
  maxAttempts = 3,
  retryCount = 3
): Promise<ExecutionResult> {
  let retries = 0;
  let totalAttempts = 0;
  let labeler = new ElementLabeler();
  const actionContext: ActionContext = {
    previousActions: [],
    currentUrl: page.url()
  };

  while (totalAttempts < maxAttempts) {
    console.log(`Attempt ${totalAttempts + 1} of ${maxAttempts}`);

    // Capture current state
    // const domContext = await extractPageElements(page);

    // Update labeler with new elements
    labeler = new ElementLabeler();
    const { domContext, labeledElements } = await labeler.labelElements(page);

    const { buffer: screenshot } = await captureScreenshot(page);


    // Get next action
    const plan = await generatePlan(
      goal,
      [screenshot.toString('base64')],
      domContext.map(ctx => {
        return {
          numericalLabel: ctx.numericalLabel,
          // tag: ctx.tag,
          // isInput: ctx.isInput,
        }
      }),
      actionContext
    );

    if (!plan) throw new Error('Failed to generate plan');
    console.log('Next action plan:', JSON.stringify(plan, null, 2));

    // If we have an answer, we're done
    if (plan.action.type === 'answer') {
      return {
        completed: true,
        retries,
        answer: plan.action.answer
      };
    }

    // Try to execute the action
    let actionCompleted = await attemptAction(page, plan.action, labeler);

    while (!actionCompleted && retries < retryCount) {
      console.log(`Action failed, retrying... (Attempt ${retries + 1}/${retryCount})`);
      retries++;
      actionCompleted = await attemptAction(page, plan.action, labeler);
    }

    if (!actionCompleted) {
      console.error("Failed to execute action after retries");
      return { completed: false, retries };
    }

    // Record the action in context
    actionContext.previousActions.push({
      action: plan.action,
      timestamp: Date.now(),
      url: page.url()
    });
    actionContext.currentUrl = page.url();

    // Check if we're done
    if (plan.completed) {
      return {
        completed: true,
        retries,
        // @ts-ignore
        answer: plan.action.type === 'answer' ? plan.action.answer : undefined
      };
    }

    totalAttempts++;
    await page.waitForTimeout(1000); // Wait for page to settle
  }

  return {
    completed: false,
    retries,
    answer: undefined
  };
}

async function attemptAction(page: Page, action: PlanAction, labeler: ElementLabeler): Promise<boolean> {
  try {
    console.log(`Attempting action:`, action);
    let element: ElementHandle | null = null;

    // If we have a numerical label, use it to find the element
    if (action.numericalLabel !== undefined) {
      const labeledElement = labeler.getElementById(action.numericalLabel);
      console.log('labeledElement', labeledElement?.numericalLabel, labeledElement?.metadata);
      if (labeledElement) {
        element = labeledElement.element;
      }
    }

    // // Fallback to traditional selectors if labeled element not found
    // if (!element) {
    //   if (action.cssSelector) {
    //     element = await page.$(action.cssSelector);
    //   }
    //   if (!element && action.xpathSelector) {
    //     element = await page.$(`xpath=${action.xpathSelector}`);
    //   }
    //   if (!element && action.selector && action.selectorType) {
    //     const selectorMap: Record<string, string> = {
    //       class: `.${action.selector}`,
    //       id: `#${action.selector}`,
    //       name: `[name="${action.selector}"]`,
    //       tag: action.selector
    //     };
    //     element = await page.$(selectorMap[action.selectorType]);
    //   }
    // }
    //
    // Perform action based on type
    switch (action.type) {
      case 'click':
        if (element) {
          await element.click();
        } else if (action.coordinates) {
          await page.mouse.click(action.coordinates.x, action.coordinates.y);
        } else {
          return false;
        }
        break;

      case 'type':
        if (element && action.text) {
          await element.fill(''); // Clear existing content
          await element.fill(action.text);
        } else {
          return false;
        }
        break;

      case 'scroll':
        if (action.target === 'WINDOW') {
          await page.evaluate((direction) => {
            window.scrollBy(0, direction === 'down' ? 300 : -300);
          }, action.direction);
        } else if (element) {
          await element.scrollIntoViewIfNeeded();
        } else {
          return false;
        }
        break;

      case 'wait':
        await page.waitForTimeout(5000);
        break;

      case 'goback':
        await page.goBack();
        break;

      case 'google':
        await page.goto('https://www.google.com');
        break;

      case 'answer':
      case 'complete':
        // These are marker actions, no actual browser interaction needed
        break;
    }

    // Capture screenshot after action for debugging
    await captureScreenshot(page);
    return true;
  } catch (error: any) {
    console.error(`Action attempt failed: ${error.message}`);
    await captureScreenshot(page);
    return false;
  }
}

async function extractPageElements(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    function getXPath(element: Element): string {
      if (element.id) {
        return `//*[@id="${element.id}"]`;
      }

      const parts: string[] = [];
      let current: Element | null = element;

      while (current && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();
        const parent: HTMLElement | null = current.parentElement;

        if (parent) {
          const siblings = Array.from(parent.children).filter(child =>
            child.tagName === current!.tagName
          );

          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `[${index}]`;
          }
        }

        parts.unshift(selector);
        current = parent;
      }

      return '/' + parts.join('/');
    }

    function getCssSelector(element: Element): string {
      if (element.id) {
        return `#${element.id}`;
      }

      const parts: string[] = [];
      let current: Element | null = element;

      while (current && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
          selector = `#${current.id}`;
          parts.unshift(selector);
          break;
        }

        if (current.classList.length) {
          selector += Array.from(current.classList)
            .map(cls => `.${cls}`)
            .join('');
        }

        const parent: HTMLElement | null = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(child =>
            child.tagName === current!.tagName &&
            child.classList.toString() === current!.classList.toString()
          );

          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }

        parts.unshift(selector);
        current = parent;
      }

      return parts.join(' > ');
    }

    return Array.from(document.querySelectorAll('button, input, a')).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().slice(0, 30),
      id: el.id,
      classes: Array.from(el.classList),
      name: (el as HTMLInputElement).name || null,
      href: (el as HTMLAnchorElement).href || null,
      cssSelector: getCssSelector(el),
      xpathSelector: getXPath(el),
    }));
  });
}
