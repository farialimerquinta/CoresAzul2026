import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tournament.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    photo TEXT,
    nickname TEXT,
    court_position TEXT,
    availability_21 TEXT,
    availability_22 TEXT,
    availability_28 TEXT
  );
  
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS logo_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logo_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_id INTEGER NOT NULL,
    user_ip TEXT NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES logo_options(id)
  );
`);

// Ensure new columns exist (migration)
const columns = [
  { name: 'nickname', type: 'TEXT' },
  { name: 'court_position', type: 'TEXT' },
  { name: 'availability_21', type: 'TEXT' },
  { name: 'availability_22', type: 'TEXT' },
  { name: 'availability_28', type: 'TEXT' }
];

for (const col of columns) {
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN ${col.name} ${col.type}`).run();
  } catch (e) {
    // Column already exists
  }
}

// Seed data if empty
const count = db.prepare("SELECT COUNT(*) as count FROM players").get() as { count: number };
if (count.count === 0) {
  const players = [
    // Category A
    { name: "Eric Hayashida", category: "A" },
    { name: "Julio Nuruki", category: "A" },
    { name: "Pedro Tomiyoshi", category: "A" },
    { name: "Savino Micco", category: "A" },
    // Category B
    { name: "Claudio Udo", category: "B" },
    { name: "Alexandre Uehara", category: "B" },
    { name: "Maysa Nakashima", category: "B" },
    { name: "Norimiti Fukuma", category: "B" },
    { name: "Fabricio Oliveira", category: "B" },
    { name: "Fernando Higa", category: "B" },
    { name: "Victor Sunto", category: "B" },
    { name: "Sheila Okazaki", category: "B" },
    // Category C
    { name: "Marcio Muramoto", category: "C" },
    { name: "Eric Shigetomi", category: "C" },
    { name: "Kenzo Iwasaki", category: "C" },
    { name: "Maria Ishikawa", category: "C" },
    { name: "Rose Taketani", category: "C" },
    { name: "Willian Kubota", category: "C" },
    // Category D
    { name: "Leandro Enjoji", category: "D" },
    { name: "Marcell Anno", category: "D" },
    { name: "Thiago Irino", category: "D" },
    { name: "Elia Yamakawa", category: "D" },
    { name: "Adriana Watanabe", category: "D" },
    { name: "Aquino Ito", category: "D" },
    // Category E
    { name: "Alan Yogui", category: "E" },
    { name: "Jefferson Sena", category: "E" },
    { name: "Katia Goshi", category: "E" },
    { name: "Sayuri Takata", category: "E" },
    { name: "Guilherme Haraguchi", category: "E" },
    { name: "Rodrigo Galo", category: "E" },
    // Category F
    { name: "Raquel Honda", category: "F" },
    { name: "Nayara Costa", category: "F" },
    { name: "Adriana Irino", category: "F" },
    { name: "Roberto Brito", category: "F" },
    { name: "Midori Tukiama", category: "F" },
    { name: "Luciana Oliveira", category: "F" },
  ];

  const insert = db.prepare("INSERT INTO players (name, category) VALUES (?, ?)");
  const insertMany = db.transaction((players) => {
    for (const p of players) insert.run(p.name, p.category);
  });
  insertMany(players);
  
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("logo", null);
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("voting_deadline", "2026-03-20");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/players", (req, res) => {
    const players = db.prepare("SELECT * FROM players").all();
    res.json(players);
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings/deadline", (req, res) => {
    const { deadline } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'voting_deadline'").run(deadline);
    res.json({ success: true });
  });

  app.get("/api/logo-options", (req, res) => {
    const options = db.prepare(`
      SELECT lo.*, COUNT(lv.id) as votes 
      FROM logo_options lo 
      LEFT JOIN logo_votes lv ON lo.id = lv.option_id 
      GROUP BY lo.id
    `).all();
    res.json(options);
  });

  app.post("/api/logo-options", (req, res) => {
    const { image } = req.body;
    db.prepare("INSERT INTO logo_options (image) VALUES (?)").run(image);
    res.json({ success: true });
  });

  app.post("/api/logo-options/:id/vote", (req, res) => {
    const { id } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    // Check if user already voted (simple IP check)
    const existing = db.prepare("SELECT id FROM logo_votes WHERE user_ip = ?").get(ip);
    if (existing) {
      return res.status(400).json({ error: "Você já votou!" });
    }

    db.prepare("INSERT INTO logo_votes (option_id, user_ip) VALUES (?, ?)").run(id, ip);
    res.json({ success: true });
  });

  app.post("/api/players/:id", (req, res) => {
    const { id } = req.params;
    const { photo, nickname, court_position, availability_21, availability_22, availability_28 } = req.body;
    
    const updates: string[] = [];
    const params: any[] = [];

    if (photo !== undefined) { updates.push("photo = ?"); params.push(photo); }
    if (nickname !== undefined) { updates.push("nickname = ?"); params.push(nickname); }
    if (court_position !== undefined) { updates.push("court_position = ?"); params.push(court_position); }
    if (availability_21 !== undefined) { updates.push("availability_21 = ?"); params.push(availability_21); }
    if (availability_22 !== undefined) { updates.push("availability_22 = ?"); params.push(availability_22); }
    if (availability_28 !== undefined) { updates.push("availability_28 = ?"); params.push(availability_28); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE players SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true });
  });

  app.post("/api/players/:id/photo", (req, res) => {
    const { id } = req.params;
    const { photo } = req.body;
    db.prepare("UPDATE players SET photo = ? WHERE id = ?").run(photo, id);
    res.json({ success: true });
  });

  app.post("/api/settings/logo", (req, res) => {
    const { photo } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'logo'").run(photo);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
