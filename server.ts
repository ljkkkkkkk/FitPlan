import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("fitness.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    profile TEXT,
    plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    weight REAL,
    calories_in INTEGER,
    calories_out INTEGER,
    completed_workout BOOLEAN,
    UNIQUE(user_id, date),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_user_date ON logs(user_id, date);
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/user/profile", (req, res) => {
    const { email, profile, plan } = req.body;
    const stmt = db.prepare(`
      INSERT INTO users (email, profile, plan) 
      VALUES (?, ?, ?) 
      ON CONFLICT(email) DO UPDATE SET profile=excluded.profile, plan=excluded.plan
    `);
    stmt.run(email, JSON.stringify(profile), JSON.stringify(plan));
    res.json({ success: true });
  });

  app.get("/api/user/:email", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.params.email);
    if (user) {
      res.json({
        profile: JSON.parse(user.profile),
        plan: JSON.parse(user.plan)
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/logs", (req, res) => {
    const { email, date, weight, calories_in, calories_out, completed_workout } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const stmt = db.prepare(`
      INSERT INTO logs (user_id, date, weight, calories_in, calories_out, completed_workout)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET 
        weight=excluded.weight, 
        calories_in=excluded.calories_in, 
        calories_out=excluded.calories_out, 
        completed_workout=excluded.completed_workout
    `);
    stmt.run(user.id, date, weight, calories_in, calories_out, completed_workout ? 1 : 0);
    res.json({ success: true });
  });

  app.get("/api/logs/:email", (req, res) => {
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(req.params.email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const logs = db.prepare("SELECT * FROM logs WHERE user_id = ? ORDER BY date ASC").all(user.id);
    res.json(logs);
  });

  app.post("/api/user/plan", (req, res) => {
    const { email, plan } = req.body;
    const stmt = db.prepare("UPDATE users SET plan = ? WHERE email = ?");
    stmt.run(JSON.stringify(plan), email);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
