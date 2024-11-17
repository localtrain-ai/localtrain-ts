import {
  detectVariables,
  resolveDynamicVariables,
  resolveRemainingVariables,
  resolveSystemVariables
} from './utils';
import { clone } from 'lodash';
import { ContextDTO } from '../types';

describe('resolveDynamicVariables with Fallback Support', () => {
  const mockContext: ContextDTO = {
    userInput: {
      Keyword: 'AI Research',
      URL: 'https://original-input-url.com',
      path: {
        output: 'path-output-original',
      },
    },
    run: {},
    runId: '123',
    stepResults: {
      scraper_1: {
        text: 'scraper-text',
        url: 'https://scraper-url.com',
      },
      apiCall_1: {
        data: 'api-call-data',
      },
      advancedScraper_1: {
        output: {
          text: ['sample extracted text'],
          links: [
            { href: 'https://example-link-1.com' },
            { href: 'https://example-link-2.com' },
          ],
        },
      },
    },
    systemExecutionContext: {
      iterationIndex: 0,
    },
  } as ContextDTO;

  it('should replace a variable from stepResults when available', () => {
    const input = '@scraper_1.url';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('https://scraper-url.com');
  });

  it('should replace a variable from originalInput when not in stepResults', () => {
    const input = '@URL';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('https://original-input-url.com');
  });

  it('should prioritize stepResults over originalInput if both contain the variable', () => {
    const input = '@path.output';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('path-output-original'); // Fallback value if not in stepResults
  });

  it('should replace part of a URL containing a dynamic variable from stepResults', () => {
    const input = 'https://example.com/@scraper_1.text/info';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('https://example.com/scraper-text/info');
  });

  it('should replace part of a URL containing a dynamic variable from originalInput', () => {
    const input = 'https://example.com/@path.output/info';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('https://example.com/path-output-original/info');
  });

  it('should replace multiple dynamic variables in the same string', () => {
    const input = 'Visit @scraper_1.url and @URL';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe(
      'Visit https://scraper-url.com and https://original-input-url.com'
    );
  });

  it('should return non-string values as-is', () => {
    const input = 12345;
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe("12345");
  });

  it('should retain unmatched variables if not found in both sources', () => {
    const input = 'Check this @nonExistentVar';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('Check this @nonExistentVar');
  });


  it('should replace multiple nested variables within a complex string', () => {
    const input =
      'As a research analyst, take this html of Google Search, @advancedScraper_1.output.text[@iterationIndex] and @advancedScraper_1.output.links[@iterationIndex].href, and create a structured comprehensive JSON when researching for the keyword @Keyword. Make sure to include only the information related to @Keyword and nothing else including links. Output only the JSON with /n and nothing else whatsoever.';
    const result = resolveDynamicVariables(input, mockContext, {debug: true});
    expect(result).toBe(
      'As a research analyst, take this html of Google Search, sample extracted text and https://example-link-1.com, and create a structured comprehensive JSON when researching for the keyword AI Research. Make sure to include only the information related to AI Research and nothing else including links. Output only the JSON with /n and nothing else whatsoever.'
    );
  });

  it('should retain unmatched variables if not found in both sources', () => {
    const input = 'Check this @nonExistentVar and @anotherMissing';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('Check this @nonExistentVar and @anotherMissing');
  });

  it('should replace a variable from stepResults when available', () => {
    const input = '@advancedScraper_1.output.text';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe("[\"sample extracted text\"]");
  });

  it('should replace a variable from originalInput when not in stepResults', () => {
    const input = '@Keyword';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('AI Research');
  });

  it('should replace a variable from stepResults but leave the system variable out if the variable is not available in the execution context', () => {
    const input = '@advancedScraper_1.output.text[0] @iterationIndex';
    const clonedContext = clone(mockContext);
    delete clonedContext.systemExecutionContext;
    const result = resolveDynamicVariables(input, clonedContext);
    expect(result).toBe('sample extracted text @iterationIndex');
  });


  it('should replace a variable from systemContext', () => {
    const input = '@iterationIndex';
    const result = resolveDynamicVariables(input, mockContext, {systemVariables: ['iterationIndex'], debug: true});
    expect(result).toBe('0');
  });

  it('should handle complex URL replacements', () => {
    const input = 'https://example.com/@advancedScraper_1.output.links[@iterationIndex].href/info';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('https://example.com/https://example-link-1.com/info');
  });

  it('should retain unmatched system variables not in context', () => {
    const input = 'Processing item @nonExistentSystemVar';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['nonExistentSystemVar'],
    });
    expect(result).toBe('Processing item @nonExistentSystemVar');
  });

  it('should handle complex nested variables with some missing keys gracefully', () => {
    const input = 'The text is @advancedScraper_1.output.text[@missingIndex]';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['missingIndex'],
      debug: true,
    });
    expect(result).toBe('The text is [\"sample extracted text\"][@missingIndex]');
  });

  it('should differentiate similar system and context variable names', () => {
    const input = 'Index: @iterationIndex, Simple Iteration: @iteration';
    const mockContextWithIteration = {
      ...mockContext,
      userInput: { ...mockContext.userInput, iteration: 'SimpleIteration' },
    };
    const result = resolveDynamicVariables(input, mockContextWithIteration, {
      systemVariables: ['iterationIndex'],
    });
    expect(result).toBe('Index: 0, Simple Iteration: SimpleIteration');
  });

  it('should correctly handle array and object variables from context', () => {
    const input = 'Data: @apiCall_1.data and array text: @advancedScraper_1.output.text';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('Data: api-call-data and array text: ["sample extracted text"]');
  });

  it('should return string as-is when no variables are detected', () => {
    const input = 'This is a plain text without variables.';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('This is a plain text without variables.');
  });

  it('should detect closely placed variables accurately', () => {
    const input = '@scraper_1.text@URL';
    const result = resolveDynamicVariables(input, mockContext);
    expect(result).toBe('scraper-texthttps://original-input-url.com');
  });

  it('should detect only system variables in isolation', () => {
    const input = 'Processing item @iterationIndex in list';
    const result = detectVariables(input);
    expect(result).toEqual(['@iterationIndex']);
  });

  it('should detect all variables in isolation', () => {
    const input = '@scraper_1.url and @URL';
    const result = detectVariables(input);
    expect(result).toEqual(['@scraper_1.url', '@URL']);
  });

  it('should resolve system variables in isolation', () => {
    const input = 'Current iteration: @iterationIndex';
    const result = resolveSystemVariables(input, ['iterationIndex'], mockContext, { debug: true });
    expect(result).toBe('Current iteration: 0');
  });

  it('should resolve remaining variables in isolation', () => {
    const input = 'Visit @scraper_1.url and @URL';
    const result = resolveRemainingVariables(input, mockContext, { debug: true });
    expect(result).toBe(
      'Visit https://scraper-url.com and https://original-input-url.com'
    );
  });

  it('should perform complete resolution with both system and context variables', () => {
    const input = 'Crawling @scraper_1.url for @Keyword with index @iterationIndex';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['iterationIndex'],
      debug: true,
    });
    expect(result).toBe(
      'Crawling https://scraper-url.com for AI Research with index 0'
    );
  });

  it('should replace nested system variables first, then context variables', () => {
    const input =
      'As a research analyst, take this html of Google Search, @advancedScraper_1.output.text and @advancedScraper_1.output.links[@iterationIndex].href, and create a structured comprehensive JSON when researching for the keyword @Keyword.';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['iterationIndex'],
      debug: true,
    });
    expect(result).toBe(
      'As a research analyst, take this html of Google Search, ["sample extracted text"] and https://example-link-1.com, and create a structured comprehensive JSON when researching for the keyword AI Research.'
    );
  });

  it('should handle complex URL replacements with system variables resolved first', () => {
    const input = 'https://example.com/@advancedScraper_1.output.links[@iterationIndex].href/info';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['iterationIndex'],
      debug: true,
    });
    expect(result).toBe('https://example.com/https://example-link-1.com/info');
  });

  it('should resolve multiple dynamic variables including system and context variables', () => {
    const input = 'Link: @scraper_1.url and text: @advancedScraper_1.output.text with URL: @URL';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['iterationIndex'],
      debug: true,
    });
    expect(result).toBe(
      'Link: https://scraper-url.com and text: ["sample extracted text"] with URL: https://original-input-url.com'
    );
  });

  it('should process deeply nested dynamic variables across multiple passes', () => {
    const input = 'Starting crawl on @advancedScraper_1.output.links[@iterationIndex].href at iteration @iterationIndex with keyword @Keyword';
    const result = resolveDynamicVariables(input, mockContext, {
      systemVariables: ['iterationIndex'],
      debug: true,
    });
    expect(result).toBe(
      'Starting crawl on https://example-link-1.com at iteration 0 with keyword AI Research'
    );
  });
});
