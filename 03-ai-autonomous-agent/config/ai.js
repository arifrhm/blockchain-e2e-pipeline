// 03-ai-autonomous-agent/config/ai.js
// Client wrapper for 9Router AI Gateway with Zero Hardcoded Credentials

const fs = require('fs');
const path = require('path');

const ROUTER_ENV_FILE = '/root/.config/ai/router.env';
const SQLITE_DB_FILE = '/root/.9router/db/data.sqlite';

class AiClient {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'http://127.0.0.1:20128/v1'; // Local low-latency endpoint
    this.model = 'ag/gemini-3.8-flash';
    this.initCredentials();
  }

  initCredentials() {
    // 1. Try reading from /root/.config/ai/router.env
    if (fs.existsSync(ROUTER_ENV_FILE)) {
      try {
        const content = fs.readFileSync(ROUTER_ENV_FILE, 'utf8');
        content.split('\n').forEach(line => {
          let trimmed = line.trim();
          if (trimmed.startsWith('export ')) trimmed = trimmed.replace('export ', '');
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
              const k = trimmed.slice(0, idx).trim();
              let v = trimmed.slice(idx + 1).trim();
              if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1);
              }
              if (k === 'OPENAI_API_KEY' && !this.apiKey) {
                this.apiKey = v;
              }
            }
          }
        });
      } catch (err) {
        // Fallback silently
      }
    }

    // 2. Fallback to /root/.9router/db/data.sqlite if needed
    if (!this.apiKey && fs.existsSync(SQLITE_DB_FILE)) {
      try {
        const sqlite = require('node:sqlite');
        const db = new sqlite.DatabaseSync(SQLITE_DB_FILE);
        const row = db.prepare('SELECT key FROM apiKeys WHERE isActive = 1 LIMIT 1').get();
        if (row && row.key) {
          this.apiKey = row.key;
        }
      } catch (err) {
        // Fallback
      }
    }

    if (!this.apiKey) {
      throw new Error('Failed to load 9Router API key from router.env or SQLite database');
    }
  }

  async chatCompletion({ messages, temperature = 0.1 }) {
    const url = `${this.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        temperature: temperature,
        messages: messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`9Router Error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Strip markdown code block wrappers if JSON format was requested
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return content.trim();
  }
}

module.exports = new AiClient();
