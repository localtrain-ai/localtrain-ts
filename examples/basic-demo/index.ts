import {config} from "dotenv";

config();
import {Agent} from "@localtrain.ai/core";
import {Openai} from "@localtrain.ai/packages";


const agent = new Agent()
    .useProviders(new Openai({apiKey: process.env.OPENAI_API_KEY}))
    .addBehaviour({
        name: "asdad",
        inputs: {
            prompt: "summarize my name in english"
        },
        provider: "open-ai",
        providerType: "llm",
    })
    .run()
    .then(resultContext => {
        console.log('res', resultContext.result)
    })