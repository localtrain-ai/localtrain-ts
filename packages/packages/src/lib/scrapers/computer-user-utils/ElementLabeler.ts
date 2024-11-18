import { ElementHandle, Page } from 'playwright';

interface LabeledElement {
  numericalLabel: number;
  element: ElementHandle;
  coordinates: any;
  selectors: any;
  metadata: any;
}

export class ElementLabeler {
  private labeledElements: Map<number, LabeledElement>;
  private currentLabel: number;

  constructor() {
    this.labeledElements = new Map();
    this.currentLabel = 1;
  }

  getElementById(id: number): LabeledElement | undefined {
    return this.labeledElements.get(id);
  }

  async labelElements(page: Page): Promise<{domContext: any[], labeledElements: Map<number, LabeledElement>}> {
    // Reset state
    this.labeledElements.clear();
    this.currentLabel = 1;

    // Find all interactive elements
    const elements = await page.$$(
      'button, input, a, [role="button"], [role="link"], [role="textbox"], select, textarea'
    );

    const domContext = [];

    for (const element of elements) {
      try {
        // Get element metadata and comprehensive selectors
        const metadata = await this.getElementMetadata(element);

        // Skip hidden elements
        const isVisible = await element.isVisible();
        if (!isVisible) continue;

        // Get element position
        const boundingBox = await element.boundingBox();
        if (!boundingBox) continue;

        // Create labeled element
        const labeledElement: LabeledElement = {
          numericalLabel: this.currentLabel,
          element,
          coordinates: boundingBox,
          selectors: metadata.selectors,
          metadata,
        };

        // Add to tracking map
        this.labeledElements.set(this.currentLabel, labeledElement);

        // Add visual label to the page
        await this.addLabelToPage(
          page,
          element,
          this.currentLabel,
          boundingBox
        );

        // Add to DOM context with numerical label
        domContext.push({
          numericalLabel: this.currentLabel,
          tag: metadata.tag,
          type: metadata.type,
          role: metadata.role,
          ariaLabel: metadata.ariaLabel,
          text: metadata.text,
          value: metadata.value,
          isButton: metadata.isButton,
          isInput: metadata.isInput,
          isLink: metadata.isLink,
          isClickable: metadata.isClickable,
          coordinates: boundingBox,
          selectors: metadata.selectors,
          typeIndicator: metadata.isButton ? '🔘' :
                        metadata.isInput ? '✏️' :
                        metadata.isLink ? '🔗' : '👆',
          // cssSelector: getCssSelector(element),
          // xpathSelector: getXPath(element),
        });

        this.currentLabel++;
      } catch (error) {
        console.error('Error labeling element:', error);
        continue;
      }
    }

    return { domContext, labeledElements: this.labeledElements  };
  }

  private async addLabelToPage(
    page: Page,
    element: ElementHandle,
    label: number,
    coordinates: any
  ) {
    const { x, y } = coordinates;
    const elementType = await this.getElementMetadata(element);
    const typeIndicator = elementType.isButton
      ? '🔘'
      : elementType.isInput
      ? '✏️'
      : elementType.isLink
      ? '🔗'
      : '👆';

    await page.evaluate(
      ({ x, y, label, typeIndicator }) => {
        const labelElement = document.createElement('div');
        labelElement.textContent = `${typeIndicator}${label}`;
        labelElement.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          background: #007AFF;
          color: white;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 12px;
          z-index: 10000;
          pointer-events: none;
        `;
        document.body.appendChild(labelElement);
      },
      { x, y, label, typeIndicator }
    );
  }

  private async getElementMetadata(element: ElementHandle): Promise<any> {
    const metadata = await element.evaluate((el) => ({
      tag: (el as HTMLInputElement).tagName.toLowerCase(),
      type: (el as HTMLInputElement).type || null,
      role: (el as HTMLInputElement).getAttribute('role'),
      ariaLabel: (el as HTMLInputElement).getAttribute('aria-label'),
      text: (el as HTMLInputElement).textContent?.trim() || '',
      value: (el as HTMLInputElement).value || '',
      isButton:
        (el as HTMLInputElement).tagName.toLowerCase() === 'button' ||
        (el as HTMLInputElement).getAttribute('role') === 'button' ||
        ((el as HTMLInputElement).tagName.toLowerCase() === 'input' &&
          (el as HTMLInputElement).type === 'button') ||
        ((el as HTMLInputElement).tagName.toLowerCase() === 'input' &&
          (el as HTMLInputElement).type === 'submit'),
      isInput:
        (el as HTMLInputElement).tagName.toLowerCase() === 'input' || (el as HTMLInputElement).tagName.toLowerCase() === 'textarea' &&
        ['text', 'search', 'email', 'password'].includes(
          (el as HTMLInputElement).type || ''
        ),
      isLink: (el as HTMLInputElement).tagName.toLowerCase() === 'a',
      isClickable:
        (el as HTMLInputElement).onclick != null ||
        (el as HTMLInputElement).tagName.toLowerCase() === 'button' ||
        (el as HTMLInputElement).tagName.toLowerCase() === 'a' ||
        (el as HTMLInputElement).getAttribute('role') === 'button',
    }));

    return {
      ...metadata,
      selectors: await this.generateSelectors(element),
    };
  }

  private async generateSelectors(
    element: ElementHandle
  ): Promise<{ css?: string; xpath?: string; text?: string }> {
    const selectors: { css?: string; xpath?: string; text?: string } = {};

    try {
      // Get CSS selector
      selectors.css = await element.evaluate((el) => {
        const path: string[] = [];
        let current = el as Element;

        while (current && current !== document.body) {
          if (current.id) {
            path.unshift(`#${current.id}`);
            break;
          } else {
            let selector = current.tagName.toLowerCase();
            if (current.classList.length) {
              selector += `.${Array.from(current.classList).join('.')}`;
            }
            path.unshift(selector);
          }
          current = current.parentElement as Element;
        }

        return path.join(' > ');
      });

      // Get text content for text-based selection
      const text = await element.textContent();
      if (text) {
        selectors.text = text.trim();
      }
    } catch (error) {
      console.error('Error extracting selectors:', error);
    }

    return selectors;
  }
}
