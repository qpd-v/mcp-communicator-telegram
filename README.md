# MCP Communicator (Telegram)

An MCP server that enables communication with users through Telegram. This server provides a tool to ask questions to users and receive their responses via a Telegram bot.

## Installation

### Via npm (global)

```bash
npm install -g mcp-communicator-telegram
```

### Via npx (on-demand)

```bash
npx mcptelegram
```

To get your Telegram chat ID:
```bash
npx mcptelegram-chatid
```

## Features

- Ask questions to users through Telegram
- Receive responses asynchronously (waits indefinitely for response)
- Support for reply-based message tracking
- Secure chat ID validation
- Error handling and logging

## Prerequisites

- Node.js (v14 or higher)
- A Telegram bot token (obtained from [@BotFather](https://t.me/botfather))
- Your Telegram chat ID (can be obtained using the included utility)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/qpd-v/mcp-communicator-telegram.git
cd mcp-communicator-telegram
```

2. Install dependencies:
```bash
npm install
```

3. Create a Telegram bot:
   - Open Telegram and search for [@BotFather](https://t.me/botfather)
   - Send `/newbot` and follow the instructions
   - Save the bot token you receive

4. Get your chat ID:
   - Copy `.env.example` to `.env`
   - Add your bot token to the `.env` file:
     ```
     TELEGRAM_TOKEN=your_bot_token_here
     ```
   - Run the chat ID utility:
     ```bash
     npm run build
     node build/get-chat-id.js
     ```
   - Send any message to your bot
   - Copy the chat ID that appears in the console
   - Add the chat ID to your `.env` file:
     ```
     TELEGRAM_TOKEN=your_bot_token_here
     CHAT_ID=your_chat_id_here
     ```

## Configuration

Add the server to your MCP settings file (usually located at `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json` on Windows):

```json
{
  "mcpServers": {
    "mcp-communicator-telegram": {
      "command": "node",
      "args": ["path/to/mcp-communicator-telegram/build/index.js"],
      "env": {
        "TELEGRAM_TOKEN": "your_bot_token_here",
        "CHAT_ID": "your_chat_id_here"
      }
    }
  }
}
```

## Available Tools

### ask_user

Asks a question to the user via Telegram and waits for their response.

Input Schema:
```json
{
  "type": "object",
  "properties": {
    "question": {
      "type": "string",
      "description": "The question to ask the user"
    }
  },
  "required": ["question"]
}
```

Example usage:
```typescript
const response = await use_mcp_tool({
  server_name: "mcp-communicator-telegram",
  tool_name: "ask_user",
  arguments: {
    question: "What is your favorite color?"
  }
});
```

## Development

Build the project:
```bash
npm run build
```

Run in development mode:
```bash
npm run dev
```

Watch for changes:
```bash
npm run watch
```

Clean build directory:
```bash
npm run clean
```

## Security

- The server only responds to messages from the configured chat ID
- Environment variables are used for sensitive configuration
- Message IDs are used to track question/answer pairs
- The bot ignores messages without proper context

## License

ISC

## Author

qpd-v

## Version

0.1.2