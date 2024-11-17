export class InputValidator {
  validate(requiredInputs: { name: string }[], userInput: Record<string, any>) {
    const missingInputs = requiredInputs
      .filter(input => !userInput[input.name])
      .map(input => input.name);
    if (missingInputs.length) {
      throw new Error(`Missing inputs: ${missingInputs.join(', ')}`);
    }
  }
}
