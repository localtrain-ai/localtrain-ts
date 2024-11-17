import { getProperty } from './dot-prop';
import { ContextDTO } from '../types';


// Detect other dynamic variables in the input
export const detectVariables = (str: string): string[] => {
  const regex = /@(\w+(\.\w+)*(\[\d+\])*(\.\w+)?)/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(str)) !== null) {
    matches.add(match[0]);
  }
  return Array.from(matches);
};

// Detect system variables in the input
export const detectSystemVariables = (str: string): string[] => {
  const regex = /@(\w+(\.\w+)*)/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(str)) !== null) {
    matches.add(match[0]);
  }
  return Array.from(matches);
};

// Resolve system variables only
export const resolveSystemVariables = (
  str: string,
  systemVariables: string[],
  context: ContextDTO,
  options: { debug?: boolean }
): string => {
  const systemVariablesInCtx = Object.keys(context.systemExecutionContext || {});
  if(!systemVariablesInCtx) {
    console.log(`Requested for a system variable but it wasn't found in the execution context.`, context.runId);
    return '';
  }
  const variables = detectSystemVariables(str);
  let isReplacementMade = false;
  variables.forEach((variable, index) => {
    const systemVariable = variable.replace("@", "");
    if(!systemVariablesInCtx.includes(systemVariable)) {
      return;
    }
    if (options.debug) console.log(`Detected system variables: ${variables}`);
    const regex = new RegExp(`@${systemVariable}`, 'g');
    const systemValue = getProperty(context.systemExecutionContext, systemVariable, '');

    if (systemValue !== undefined && systemValue !== null) {
      const resolvedStr = Array.isArray(systemValue) || typeof systemValue === 'object'
        ? JSON.stringify(systemValue)
        : systemValue.toString();
      str = str.replace(regex, resolvedStr);
      isReplacementMade = true;
      if (options.debug) console.log(`Replaced system variable @${systemVariable} with ${resolvedStr}`);
    }
  })
  if(!isReplacementMade) {
    if (options.debug) console.log(`No system variables found`);
  }
  return str;
};

// Resolve remaining dynamic variables from context
export const resolveRemainingVariables = (
  str: string,
  context: ContextDTO,
  options: { convertToString?: boolean; debug?: boolean }
): string => {
  let variables = detectVariables(str);
  if (options.debug) console.log(`Detected remaining variables: ${variables}`);

  while (variables.length > 0) {
    let replacementMade = false;

    for (const variable of variables) {
      const variablePath = variable.slice(1);
      const resolvedValue = getProperty(context.stepResults, variablePath, '') || getProperty(context.userInput, variablePath, '');

      if (resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== '') {
        const resolvedStr = Array.isArray(resolvedValue) || typeof resolvedValue === 'object'
          ? JSON.stringify(resolvedValue)
          : resolvedValue.toString();
        str = str.replace(variable, resolvedStr);
        replacementMade = true;

        if (options.debug) console.log(`Replaced variable ${variable} with ${resolvedStr}`);
      } else if (options.debug) {
        console.log(`No match found for ${variable}, leaving it unresolved`);
      }
    }

    // Re-detect variables after replacements for nested resolution
    variables = detectVariables(str);
    if (options.debug) console.log(`Detected variables after pass: ${variables}`);

    if (!replacementMade) break;
  }
  return str;
};

// Main function for resolving all dynamic variables
export const resolveDynamicVariables = (
  input: string | number,
  context: ContextDTO,
  options: { convertToString?: boolean; systemVariables?: string[]; debug?: boolean } = {}
): string => {
  if (typeof input === 'number') {
    input = input + '';
  }
  // Step 1: Resolve system variables first
  // if (options.systemVariables) {
  if(context.systemExecutionContext) {
    input = resolveSystemVariables(input, options.systemVariables || [], context, options);
  }
  // }

  // Step 2: Resolve remaining variables
  input = resolveRemainingVariables(input, context, options);

  if (options.debug) console.log(`Final resolved value: ${input}`);
  return input;
};

