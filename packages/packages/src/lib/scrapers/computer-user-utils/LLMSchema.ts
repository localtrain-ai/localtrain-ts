import { z } from 'zod';

export const ScrollDirection = z.enum(['up', 'down']);
export type ScrollDirection = z.infer<typeof ScrollDirection>;

export const ActionType = z.enum(['click', 'type', 'scroll', 'wait', 'goback', 'google', 'answer', 'complete']);
export type ActionType = z.infer<typeof ActionType>;

export const PlanActionSchema = z.object({
  type: ActionType,
  // For click and type actions
  numericalLabel: z.number().optional().describe('The numerical label visible on the element in the screenshot'),
  // For type actions
  text: z.string().optional().describe('The text to type into the element'),
  // For scroll actions
  direction: ScrollDirection.optional(),
  target: z.union([z.literal('WINDOW'), z.number()]).optional().describe('WINDOW for page scroll, or numerical label for element scroll'),
  // For answer actions
  answer: z.string().optional().describe('The answer to the user\'s question'),
  // Element selectors (for internal use)
  selector: z.string().optional(),
  cssSelector: z.string().optional(),
  xpathSelector: z.string().optional(),
  selectorType: z.enum(['id', 'class', 'tag', 'name']).optional(),
  // Element position in screenshot
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

export const LLMResponseSchema = z.object({
  action: PlanActionSchema,
  completed: z.boolean(),
});

export type PlanAction = z.infer<typeof PlanActionSchema>;
export type LLMResponse = z.infer<typeof LLMResponseSchema>;
