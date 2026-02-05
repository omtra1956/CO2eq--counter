import express from "express";

const app = express();
app.use(express.static("public"));

const config = {
  start: "2026-02-5T08:00:00+01:00",
  end: "2026-02-5T18:00:00+01:00",

  powerKW: 12.0,
  emissionFactorKgPerKWh: 0.25,

  foodJumps: [
    { at: "2026-02-5T09:05:00+01:00", kg: 38.5, label: "Coffee break" },
    { at: "2026-02-5T13:30:00+01:00", kg: 120.0, label: "Pranzo" },
  ],
};

const startMs = Date.parse(config.start);
const endMs = config.end ? Date.parse(config.end) : null;
const foodEvents = config.foodJumps.map(e => ({ ...e, atMs: Date.parse(e.at) }));

function computeCO2(nowMsRaw) {
  const nowMs = Math.min(Math.max(nowMsRaw, startMs), endMs ?? nowMsRaw);

  const elapsedHours = (nowMs - startMs) / (1000 * 60 * 60);
  const energyKWh = config.powerKW * elapsedHours;
  const co2EnergyKg = energyKWh * config.emissionFactorKgPerKWh;

  let co2FoodKg = 0;
  for (const e of foodEvents) if (e.atMs <= nowMs) co2FoodKg += e.kg;

  return { totalKg: co2EnergyKg + co2FoodKg };
}

app.get("/api/current", (req, res) => res.json(computeCO2(Date.now())));

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = () => res.write(`data: ${JSON.stringify(computeCO2(Date.now()))}\n\n`);
  send();
  const id = setInterval(send, 1000);
  req.on("close", () => clearInterval(id));
});

const port = process.env.PORT || 3000;
app.listen(port);
