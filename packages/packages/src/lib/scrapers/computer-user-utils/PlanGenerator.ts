import { LLMResponse, LLMResponseSchema } from './LLMSchema';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  ChatCompletionContentPartText,
  ChatCompletionContentPartImage,
} from 'openai/resources/chat/completions';

export const llmClient: OpenAI =
  new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] })
;

const SYSTEM_PROMPT = `You are an autonomous web browsing agent that helps users find information across web pages.

IMPORTANT: Each interactive element in the screenshot has a numerical label with a type indicator:
- [number] = Button or clickable element
- [number] = Input field/textarea for typing
- [number] = Link
- [number] = Other clickable element

Your task is to suggest ONE next action that brings us closer to the goal. Consider:
1. The current page state and labeled elements
2. The history of previous actions and their results
3. Whether we've achieved our goal

RULES FOR CHOOSING ACTIONS:
1. ONE action at a time - choose the most impactful next step
2. Use correct action type based on element indicators:
   - / elements: use "type": "click"
   -  elements: use "type": "type"
3. Include ALL fallback selectors for robustness

Response format (JSON):
{
  "action": {
    // For clicking (/ elements)
    "type": "click",
    "numericalLabel": number,
    "cssSelector": "...",
    "xpathSelector": "...",
    "selector": "...",
    "selectorType": "..."
  }
  // OR for typing () elements)
  "action": {
    "type": "type",
    "numericalLabel": number,
    "text": "...",
    + fallback selectors
  }
  // OR for other actions
  "action": {
    "type": "scroll|wait|goback|google",
    ...parameters
  }
  // OR when goal is achieved
  "action": {
    "type": "answer",
    "answer": "detailed answer"
  },
  "completed": boolean,
  "reasoning": "Explain why this action was chosen and how it helps achieve the goal"
}`;

interface ActionContext {
  previousActions: Array<{
    action: any;
    timestamp: number;
    url: string;
  }>;
  currentUrl: string;
}

export async function generatePlan(
  goal: string,
  screenshots: string[],
  domContext: any[],
  context?: ActionContext
): Promise<LLMResponse | null> {
  const messagesContent: (ChatCompletionContentPartText | ChatCompletionContentPartImage)[] = [
    {
      type: 'text',
      text: `Goal: ${goal}\n\nCurrent URL: ${context?.currentUrl || 'unknown'}\n\nPrevious Actions: ${
        context?.previousActions?.length
          ? context.previousActions
              .map(
                (a) =>
                  `[${new Date(a.timestamp).toISOString()}] ${a.action.type} at ${
                    a.url
                  }`
              )
              .join('\n')
          : 'None'
      }\n\n
       Current page DOM context: ${JSON.stringify(domContext, null, 2)}
      `
    },
    ...screenshots.map(
      (base64Image) =>
        ({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high',
          },
        } as ChatCompletionContentPartImage)
    )
  ];

  const response = await llmClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      { role: 'user', content: messagesContent },
    ],
    response_format: zodResponseFormat(LLMResponseSchema, 'plan'),
  });

  const planContent = response.choices[0].message?.content || '';
  try {
    return JSON.parse(planContent) as LLMResponse;
  } catch (error) {
    console.error('Error parsing plan JSON:', error);
    return null;
  }
}
