const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LICENSE_FILE = "licenses.json";
const SIGNAL_FILE = "signals.json";

function readJSON(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
  }

  const data = fs.readFileSync(file, "utf8");

  if (!data || data.trim() === "") {
    return [];
  }

  return JSON.parse(data);
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.get("/", (req, res) => {
  res.send("TRD Copier API is running");
});

app.get("/check-license", (req, res) => {
  const { license, account } = req.query;
  const licenses = readJSON(LICENSE_FILE);

  const found = licenses.find((x) => {
    return (
      x.license === license &&
      String(x.account) === String(account) &&
      x.active === true
    );
  });

  res.json({ active: !!found });
});

app.get("/signals", (req, res) => {
  res.json(readJSON(SIGNAL_FILE));
});

app.post("/signal", (req, res) => {
  const signals = readJSON(SIGNAL_FILE);

  const signal = {
    id: Date.now(),
    action: req.body.action || "OPEN",
    masterTicket: String(req.body.masterTicket || ""),
    symbol: req.body.symbol || "",
    type: req.body.type || "",
    lot: Number(req.body.lot || 0),
    sl: Number(req.body.sl || 0),
    tp: Number(req.body.tp || 0),
    time: new Date().toISOString()
  };

  signals.push(signal);

  writeJSON(SIGNAL_FILE, signals.slice(-100));

  res.json({
    ok: true,
    signal: signal
  });
});

app.listen(PORT, () => {
  console.log(TRD Copier running on port ${PORT});
});
