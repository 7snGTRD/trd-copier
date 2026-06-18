const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LICENSE_FILE = "licenses.json";
const SIGNAL_FILE = "signals.json";
const ADMIN_PASSWORD = "TRD12345";

function readJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.get("/check-license", (req, res) => {
  const { license, account } = req.query;
  const licenses = readJSON(LICENSE_FILE);

  const found = licenses.find(
    x => x.license === license &&
    String(x.account) === String(account) &&
    x.active === true
  );

  res.json({ active: !!found });
});

app.get("/signals", (req, res) => {
  res.json(readJSON(SIGNAL_FILE));
});

app.post("/signal", (req, res) => {
  const signals = readJSON(SIGNAL_FILE);

  const signal = {
    id: Date.now(),
    symbol: req.body.symbol,
    type: req.body.type,
    lot: req.body.lot,
    sl: req.body.sl || 0,
    tp: req.body.tp || 0,
    time: new Date().toISOString()
  };

  signals.push(signal);
  writeJSON(SIGNAL_FILE, signals.slice(-50));

  res.json({ ok: true, signal });
});

app.listen(PORT, () => {
  console.log(`TRD Copier running on port ${PORT}`);
});