export class TokenManager {
    inputTokens = 0;
    outputTokens = 0;

    addUsage(count: number, step: 'input' | 'output') {
        if (step === 'output') {
            this.outputTokens += count;
        } else if (step === 'input') {
            this.inputTokens += count;
        }
    }

    getUsage() {
        return {
            inputTokens: this.inputTokens,
            outputTokens: this.outputTokens
        }
    }
}