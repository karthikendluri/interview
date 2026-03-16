const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// ── serve static files ──
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ── proxy Anthropic API ──
function proxyAnthropic(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch(e) {
      res.writeHead(400); res.end('Bad JSON'); return;
    }

    const apiKey = parsed._apiKey;
    delete parsed._apiKey; // remove from body before forwarding

    if (!apiKey) { res.writeHead(400); res.end('No API key'); return; }

    const postData = JSON.stringify(parsed);

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    };

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const apiReq = https.request(options, apiRes => {
      apiRes.on('data', chunk => res.write(chunk));
      apiRes.on('end', () => res.end());
    });

    apiReq.on('error', err => {
      res.write('data: {"type":"error","error":"' + err.message + '"}\n\n');
      res.end();
    });

    apiReq.write(postData);
    apiReq.end();
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' });
    res.end(); return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST' && pathname === '/api/chat') {
    proxyAnthropic(req, res);
  } else if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  InterviewAI running at: http://localhost:' + PORT);
  console.log('  Open that URL in Chrome or Edge');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
