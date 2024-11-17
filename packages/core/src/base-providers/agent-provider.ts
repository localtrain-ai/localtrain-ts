import { Behaviour } from '../sdk';
import { ContextDTO, IBehaviour } from '../types';
import { BaseTool, Tool } from '../sdk';
import { ITool } from '../types/tool-types';

export abstract class AgentProvider {
  name!: string;
  description!: string;
  availableUserInputs: { name: string; title: string; type: string }[] = [];
  behaviours: Behaviour[] = [];

  abstract addBehaviour(behaviour: IBehaviour): this;

  abstract addBehaviours(behaviours: IBehaviour[]): this;

  abstract run(
    userInput: Record<string, any>,
    mockRun?: boolean
  ): Promise<ContextDTO>;

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      behaviours: this.behaviours.map((behaviour) => behaviour.toJSON()),
    };
  }

  extractName(): string {
    if (this.behaviours?.length) {
      const behaviourWithName = this.behaviours.find((b) => b.getName());
      if (behaviourWithName) {
        console.warn(
          `Using name ${behaviourWithName.getName()} from the behaviour`
        );
        return behaviourWithName.getName();
      }
    }
    console.warn(`Using default name 'AgentTool' as fallback.`);
    return 'AgentTool';
  }

  asTool(tool?: Partial<ITool>): BaseTool {
    let name = this.name;
    if (!this.name) {
      console.warn(
        "Explicit name not present for the agent being used as a tool. This may lead to unreliable results. Please provider `name` and `description` in the asTool({name: '', description: '' }) method call to make sure the correct tool can be selected based on intent."
      );
      name = this.extractName();
    }
    return new Tool()
      .setProviderName('Local_Agent')
      .setName(name)
      .setDescription(tool?.description || '')
      .setParameters({
        type: 'object',
        properties: {
          prompt: {
            description:
              'The detailed understanding of the context and the prompt from for this agent to execute. The prompt should be detailed enough that the context can be propagated and understood by this agent easily',
            type: 'string',
          },
          name: {
            description: 'The name of the agent being addressed',
            type: 'string',
          },
        },
        required: ['prompt', 'name'],
      })
      .setExecutor(async (args) => {
        console.log('Prompt to agent -->', args['prompt']);
        console.log('Name of agent --> ', args['name']);
        const result = await this.run({
          prompt: args['prompt'],
          name: args['name'],
        });
        const results = Object.entries(result.stepResults).map(entry => {
          return entry[1].output;
        })
        return JSON.stringify(results);
      });
  }
}
