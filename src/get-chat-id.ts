import TelegramBot = require('node-telegram-bot-api');
import * as dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
  console.error('TELEGRAM_TOKEN is required in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('Bot is running. Please send any message to your bot (@cline_communicator_bot)...');

bot.on('message', (msg: TelegramBot.Message) => {
  console.log(`Your Chat ID is: ${msg.chat.id}`);
  console.log('You can now update your .env file with this ID');
  console.log('Press Ctrl+C to exit');
});

// Handle errors
bot.on('error', (error: Error) => {
  console.error('Bot error:', error);
});

// Keep the script running
process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit(0);
});