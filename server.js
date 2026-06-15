const express = require('express');
const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Must match MasterKey in TRD_Sender.mq5 and Render Environment Variable MASTER_KEY.
const MASTER_KEY = process.env.MASTER_KEY || 'TRDADMIN';

// Default subscriber licenses. Add more below or use admin links.
let subscribers = {
  "VIP001": true
};

let signals = [];
let nextId = 1;
const MAX_SIGNALS = 500;

function text(v) { return String(v || '').trim(); }
function upper(v) { return text(v).toUpperCase(); }
function isAuthorized(key) { return text(key) === MASTER_KEY; }
function cleanAction(v) { return upper(v) === 'CLOSE' ? 'CLOSE' : 'OPEN'; }
function cleanType(v) { return upper(v) === 'SELL' ? 'SELL' : 'BUY'; }
function getCode(req) { return text(req.query.code || req.query.license || req.body.code || req.body.license); }
function isActive(code) { return subscribers[code] === true || (subscribers[code] && subscribers[code].active === true); }

app.get('/', (req, res) => {
  res.type('text').send('TRD Free Open/Close Copier API is running');
});

// Sender endpoint. MT5 Sender posts OPEN/CLOSE signals here.
app.post('/signal', (req, res) => {
  const body = req.body || {};
  const key = body.master_key || body.key || req.query.key;
  if (!isAuthorized(key)) return res.status(403).type('text').send('BAD_KEY');

  const ticket = text(body.ticket || req.query.ticket);
  const symbol = text(body.symbol || req.query.symbol);
  if (!ticket || !symbol) return res.status(400).type('text').send('BAD_SIGNAL');

  const signal = {
    id: nextId++,
    action: cleanAction(body.action || req.query.action),
    ticket,
    symbol,
    type: cleanType(body.type || req.query.type),
    time: Date.now()
  };

  signals.push(signal);
  if (signals.length > MAX_SIGNALS) signals = signals.slice(-MAX_SIGNALS);
  console.log('SIGNAL', signal);
  res.type('text').send('OK|' + signal.id);
});

// Optional GET version for testing in browser.
app.get('/signal', (req, res) => {
  if (!isAuthorized(req.query.key || req.query.master_key)) return res.status(403).type('text').send('BAD_KEY');
  const ticket = text(req.query.ticket);
  const symbol = text(req.query.symbol);
  if (!ticket || !symbol) return res.status(400).type('text').send('BAD_SIGNAL');
  const signal = {
    id: nextId++,
    action: cleanAction(req.query.action),
    ticket,
    symbol,
    type: cleanType(req.query.type),
    time: Date.now()
  };
  signals.push(signal);
  if (signals.length > MAX_SIGNALS) signals = signals.slice(-MAX_SIGNALS);
  res.type('text').send('OK|' + signal.id);
});

// Receiver endpoint.
// Browser/JSON: /signals?code=VIP001
// MT5/plain:    /signals?code=VIP001&since=0&format=txt
app.get('/signals', (req, res) => {
  const code = getCode(req);
  const since = parseInt(req.query.since || '0', 10) || 0;
  const active = isActive(code);
  const rows = signals.filter(s => s.id > since);

  if (req.query.format === 'txt') {
    if (!active) return res.status(403).type('text').send('DISABLED');
    const lines = rows.map(s => `${s.id}|${s.action}|${s.ticket}|${s.symbol}|${s.type}`);
    return res.type('text').send(['OK', ...lines].join('\n'));
  }

  res.json({ ok: !!active, active: !!active, signals: active ? rows : [] });
});

// Admin: add/enable/disable subscribers from browser.
// Enable:  /admin/subscriber?key=TRDADMIN&code=VIP001&active=true
// Disable: /admin/subscriber?key=TRDADMIN&code=VIP001&active=false
app.get('/admin/subscriber', (req, res) => {
  if (!isAuthorized(req.query.key)) return res.status(403).json({ ok: false, error: 'BAD_KEY' });
  const code = text(req.query.code || req.query.license);
  if (!code) return res.status(400).json({ ok: false, error: 'NO_CODE' });
  const active = text(req.query.active).toLowerCase() !== 'false';
  subscribers[code] = active;
  res.json({ ok: true, code, active });
});

app.get('/admin/list', (req, res) => {
  if (!isAuthorized(req.query.key)) return res.status(403).type('text').send('BAD_KEY');
  const lines = Object.entries(subscribers).map(([k, v]) => `${k}=${isActive(k) ? 'active' : 'disabled'}`);
  res.type('text').send(lines.join('\n'));
});

app.get('/admin/clear-signals', (req, res) => {
  if (!isAuthorized(req.query.key)) return res.status(403).json({ ok: false, error: 'BAD_KEY' });
  signals = [];
  nextId = 1;
  res.json({ ok: true, cleared: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('TRD Copier Server running on port ' + port));
