const express = require('express');
const app = express();
app.use(express.json());

const MASTER_KEY = process.env.MASTER_KEY || 'CHANGE_THIS_MASTER_KEY';
let subscribers = {
  "VIP001": true
};
let signals = [];       // [{id, action, symbol, side, time}]
let nextId = 1;

app.get('/', (req, res) => res.send('TRD Free Open/Close Copier API is running'));

app.post('/admin/subscriber', (req, res) => {
  const { key, code, active } = req.body || {};
  if (key !== MASTER_KEY) return res.status(401).json({ ok:false, error:'bad_key' });
  if (!code) return res.status(400).json({ ok:false, error:'missing_code' });
  subscribers[String(code).trim()] = !!active;
  res.json({ ok:true, code:String(code).trim(), active:!!active });
});

app.post('/signal', (req, res) => {
  const { key, action, symbol, side } = req.body || {};
  if (key !== MASTER_KEY) return res.status(401).json({ ok:false, error:'bad_key' });
  if (!action || !symbol) return res.status(400).json({ ok:false, error:'missing_fields' });
  const s = { id: nextId++, action:String(action).toUpperCase(), symbol:String(symbol).toUpperCase(), side: side ? String(side).toUpperCase() : '', time: Date.now() };
  signals.push(s);
  if (signals.length > 500) signals = signals.slice(-500);
  res.json({ ok:true, signal:s });
});

app.get('/signals', (req, res) => {
  const code = String(req.query.code || '').trim();
  const after = Number(req.query.after || 0);
  if (!subscribers[code]) return res.json({ ok:false, active:false, signals:[] });
  res.json({ ok:true, active:true, signals: signals.filter(s => s.id > after) });
});

app.get('/admin/list', (req, res) => {
  if (req.query.key !== MASTER_KEY) return res.status(401).json({ ok:false, error:'bad_key' });
  res.json({ ok:true, subscribers, lastSignals: signals.slice(-20) });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('TRD API running on port ' + port));
