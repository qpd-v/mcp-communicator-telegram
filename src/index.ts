#!/usr/bin/env node
import TelegramBot = require('node-telegram-bot-api');
import * as dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  throw new Error('TELEGRAM_TOKEN and CHAT_ID are required in .env file');
}

const validatedChatId = CHAT_ID as string;
let bot: TelegramBot | null = null;
const pendingQuestions = new Map<string, (answer: string) => void>();
let lastQuestionId: string | null = null;

async function initializeBot() {
  try {
    // Create new bot instance with minimal polling configuration
    bot = new TelegramBot(TELEGRAM_TOKEN!, {
      polling: true,
      filepath: false  // Disable file downloading to avoid timeouts
    });
    
    // Handler function for messages
    const handleMessage = (msg: TelegramBot.Message) => {
      console.log('Received message:', {
        chatId: msg.chat.id.toString(),
        expectedChatId: validatedChatId,
        text: msg.text,
        replyToMessage: msg.reply_to_message?.text
      });
    
      if (msg.chat.id.toString() !== validatedChatId || !msg.text) {
        console.log('Message rejected: chat ID mismatch or no text');
        return;
      }
      
      // Extract question ID from reply or use last question ID
      let questionId = null;
      
      if (msg.reply_to_message?.text) {
        const match = msg.reply_to_message.text.match(/#([a-z0-9]+)\n/);
        if (match) {
          questionId = match[1];
        }
      }
      
      // If no question ID found in reply, use lastQuestionId
      if (!questionId) {
        questionId = lastQuestionId;
      }
      
      console.log('Question ID (from reply or last):', questionId);
      console.log('Pending questions:', Array.from(pendingQuestions.keys()));
      
      if (questionId && pendingQuestions.has(questionId)) {
        console.log('Found matching question with ID:', questionId);
        console.log('Found matching question, resolving...');
        const resolver = pendingQuestions.get(questionId)!;
        resolver(msg.text);
        pendingQuestions.delete(questionId);
        lastQuestionId = null;
        console.log('Question resolved and removed from pending');
      } else {
        console.log('No matching question found for this response');
      }
    };
    
    // Set up message handler
    bot.on('message', handleMessage);
    
    // Handle polling errors
    bot.on('polling_error', (error: Error) => {
      if (error.message.includes('409 Conflict')) {
        // Ignore 409 Conflict errors as they're expected when restarting
        return;
      }
      console.error('Polling error:', error.message);
    });
    
    // Test the connection
    const botInfo = await bot.getMe();
    console.log('Bot initialized successfully:', botInfo.username);
    
    // Clean up on process termination
    process.once('SIGINT', () => {
      if (bot) {
        bot.stopPolling();
      }
      process.exit(0);
    });
    
    return true;
    } catch (error: any) {
    console.error('Error initializing bot:', error?.message || 'Unknown error');
    return false;
    }
    }

interface AskUserParams {
  question: string;
}

async function askUser(params: AskUserParams): Promise<string> {
  if (!bot) {
    throw new Error('Bot not initialized');
  }

  const { question } = params;
  const questionId = Math.random().toString(36).substring(7);
  lastQuestionId = questionId;
  
  console.log('Asking question with ID:', questionId);
  
  try {
    await bot.sendMessage(parseInt(validatedChatId), `#${questionId}\n${question}`, {
      reply_markup: {
        force_reply: true,
        selective: true
      }
    });
    console.log('Question sent successfully');
    
    const response = await new Promise<string>((resolve) => {
      console.log('Adding question to pending map...');
      pendingQuestions.set(questionId, resolve);
      // No timeout - will wait indefinitely for a response
    });
    
    console.log('Received response:', response);
    return response;
  } catch (error: any) {
    console.error('Error in askUser:', error);
    throw new Error(`Failed to get response: ${error.message}`);
  }
}

// MCP Server Implementation
class McpServer {
  private buffer = '';

  constructor() {
    // Don't send initialization message - wait for initialize request

    // Set up stdin handling
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.handleInput.bind(this));
  }

  private sendResponse(response: any) {
    process.stdout.write(JSON.stringify(response) + "\n");
  }

  private handleInput(chunk: string) {
    this.buffer += chunk;
    const messages = this.buffer.split('\n');
    this.buffer = messages.pop() || '';

    for (const message of messages) {
      try {
        const request = JSON.parse(message);
        this.handleRequest(request).catch(error => {
          console.error('Error handling request:', error);
          this.sendResponse({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32000,
              message: error.message
            }
          });
        });
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  }

  private async handleRequest(request: any) {
    console.log('Received request:', request);
  
    switch (request.method) {
      case 'initialize':
        // Respond with required initialization info
        this.sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "mcp-communicator-telegram",
              version: "0.1.0"
            },
            capabilities: {
              tools: {
                listTools: true,
                callTool: true
              }
            }
          }
        });
        break;
  
      case 'tools/list':
        this.sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [{
              name: "ask_user",
              description: "Ask the user a question via Telegram and wait for their response",
              inputSchema: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The question to ask the user"
                  }
                },
                required: ["question"]
              }
            }]
          }
        });
        break;

      case 'tools/call':
        try {
          const answer = await askUser(request.params.arguments);
          this.sendResponse({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [{
                type: "text",
                text: answer
              }]
            }
          });
        } catch (error: any) {
          this.sendResponse({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32000,
              message: error.message
            }
          });
        }
        break;

      default:
        this.sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        });
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

// Initialize the bot and MCP server
async function main() {
  const success = await initializeBot();
  if (!success) {
    console.error('Failed to initialize bot, exiting...');
    process.exit(1);
  }
  
  console.log('MCP Communicator server running...');
  new McpServer(); // Start the MCP server
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});