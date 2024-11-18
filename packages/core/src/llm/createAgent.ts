import {LLMProvider} from "../base-providers";
import {Agent} from "../sdk";

const createAgent = (overrides = {}) => {
    // const defaults = { llmService: new LLMProvider() };
    return new Agent({});
};