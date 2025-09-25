import { MastraClient } from '@mastra/client-js';

type AgentStreamChunk = {
  type: string;
  payload?: unknown;
  [key: string]: unknown;
};

const abortController = new AbortController()

const mastraClient = new MastraClient({
  baseUrl: process.env.MASTRA_API_URL ?? 'http://localhost:4111',
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
  headers: {
    'X-Client': 'voice-agent',
    'X-Environment': process.env.NODE_ENV || 'development',
  },
  abortSignal: abortController.signal,
});

const defaultPrompt = 'What is the weather like today?';

async function run() {
  const agentName = process.env.MASTRA_AGENT_NAME ?? 'weatherAgent';
  const userInput = process.argv.slice(2).join(' ') || defaultPrompt;

  const agent = mastraClient.getAgent(agentName);
  const response = await agent.streamVNext({
    messages: [
      {
        role: 'user',
        content: userInput,
      },
    ],
  });

  response.processDataStream({
    onChunk: async (chunk) => {
      switch (chunk.type) {
        // case 'tool-call-delta': {
        //   const delta = chunk.payload.argsTextDelta;
        //   if (typeof delta === 'string') {
        //     process.stdout.write(delta);
        //   }
        //   break;
        // }
        case 'text-delta': {
          const text = chunk.payload.text;
          if (typeof text === 'string') {
            process.stdout.write(text);
          }
          break;
        }
        // case 'tool-call': {
        //   console.log('\n[client] tool-call chunk:', chunk.payload);
        //   const toolName = chunk.payload.toolName;
        //   const args = chunk.payload.args;

        //   if (typeof toolName === 'string') {
        //     console.log(`[client] Invoking tool ${toolName} with args:`, args);
        //   }
        //   break;
        // }
        // case 'tool-result': {
        //   console.log('\n[client] server tool-result:', chunk.payload);
        //   break;
        // }
        // default: {
        //   console.log('[client] chunk:');
        //   console.dir(chunk, { depth: 10 });
        // }
      }
    },
  });

  process.stdout.write('\n');
}

run().catch((error) => {
  console.error('Failed to stream agent response:', error);
  process.exitCode = 1;
});


process.once('SIGINT', () => abortController.abort())
process.once('SIGTERM', () => abortController.abort())