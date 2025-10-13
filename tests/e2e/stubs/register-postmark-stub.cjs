const fs = require('fs');
const path = require('path');
const Module = require('module');

class StubServerClient {
  constructor(serverToken) {
    this.serverToken = serverToken;
  }

  async sendEmail(message) {
    const logPath = process.env.PLAYWRIGHT_POSTMARK_LOG;
    if (!logPath) {
      throw new Error('PLAYWRIGHT_POSTMARK_LOG is not defined');
    }

    const logDir = path.dirname(logPath);
    fs.mkdirSync(logDir, { recursive: true });

    let existing = [];
    if (fs.existsSync(logPath)) {
      try {
        const content = fs.readFileSync(logPath, 'utf8');
        existing = JSON.parse(content);
      } catch (error) {
        existing = [];
      }
    }

    existing.push({
      serverToken: this.serverToken,
      message,
      timestamp: Date.now(),
    });

    fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
  }
}

const stubModule = { ServerClient: StubServerClient };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'postmark') {
    return stubModule;
  }
  return originalLoad.apply(this, arguments);
};
