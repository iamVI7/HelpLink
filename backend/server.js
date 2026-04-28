const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const rebroadcastRequests = require('./services/rebroadcastService');

// Optional: install with `npm install chalk`
let chalk;
try {
  chalk = require('chalk');
} catch {
  chalk = null; // fallback if not installed
}

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

setInterval(() => {
  rebroadcastRequests();
}, 60 * 1000); // every 1 min

// Utility functions
const boxWidth = 55;
const line = '═'.repeat(boxWidth);

const center = (text) => {
  const padding = Math.max(0, Math.floor((boxWidth - text.length) / 2));
  return ' '.repeat(padding) + text;
};

const format = (label, value) => {
  return `  ${label.padEnd(12)} → ${value}`;
};

const color = {
  title: (text) => (chalk ? chalk.bold.cyan(text) : text),
  label: (text) => (chalk ? chalk.white(text) : text),
  value: (text) => (chalk ? chalk.green(text) : text),
};

// Start server
server.listen(PORT, () => {
  const baseUrl = `http://localhost:${PORT}`;
  const time = new Date().toLocaleTimeString();
  const env = process.env.NODE_ENV || 'development';

  console.log('\n');
  console.log(`╔${line}╗`);
  console.log(`║${center(color.title(' HELPLINK BACKEND SERVER'))}                         ║`);
  console.log(`╠${line}╣`);

  console.log(`║${format(color.label('Status'), color.value('Running'))}                                     ║`);
  console.log(`║${format(color.label('Port'), color.value(PORT))}                                          ║`);
  console.log(`║${format(color.label('Mode'), color.value(env))}                                   ║`);
  console.log(`║${format(color.label('Time'), color.value(time))}                                   ║`);
  console.log(`║${format(color.label('Socket'), color.value('Connected'))}                                   ║`);
  console.log(`║${format(color.label('API'), color.value(`${baseUrl}/api`))}                      ║`);
  console.log(`║${format(color.label('Health'), color.value(`${baseUrl}/health`))}                ║`);

  console.log(`╚${line}╝`);
  console.log('\n');
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('\n🛑 Received shutdown signal, closing server...');

  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);