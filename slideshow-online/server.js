require("dotenv").config();
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const app = express();
const execFileAsync = promisify(execFile);
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "presentation.json");
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ganti-password-ini";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "ubah-session-secret-ini-sebelum-online",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(ROOT, "public")));

function readPresentation() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { title: "Presentasi Publik", interval: 7, loop: true, slides: [] }; }
}
function writePresentation(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Silakan login sebagai admin." });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pptx", ".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    cb(allowed.includes(ext) ? null : new Error("Format tidak didukung. Gunakan PPTX, PDF, JPG, PNG, atau WEBP."), allowed.includes(ext));
  }
});

app.get("/", (_req, res) => res.redirect("/slide"));
app.get("/api/presentation", (_req, res) => {
  const p = readPresentation();
  res.json({ title: p.title, interval: p.interval, loop: p.loop, slides: p.slides.map(s => ({ name: s.name, type: s.type, url: `/uploads/${encodeURIComponent(s.file)}`, pages: s.pages || 1 })) });
});
app.get("/api/admin/status", (req, res) => res.json({ loggedIn: !!(req.session && req.session.isAdmin) }));
app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Password salah." });
  req.session.isAdmin = true;
  res.json({ ok: true });
});
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post("/api/admin/presentation", requireAdmin, upload.array("files", 30), async (req, res) => {
  const uploaded = req.files || [];
  if (!uploaded.length) return res.status(400).json({ error: "Pilih minimal satu file." });
  const slides = [];
  try {
    for (const f of uploaded) {
      const ext = path.extname(f.originalname).toLowerCase();
      if (ext === ".pptx") {
        const outDir = path.join(UPLOAD_DIR, `converted-${path.parse(f.filename).name}`);
        fs.mkdirSync(outDir, { recursive: true });
        try {
          const officeCmd = process.env.LIBREOFFICE_PATH ||
            (process.platform === "win32"
              ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
              : "libreoffice");
          await execFileAsync(officeCmd, ["--headless", "--convert-to", "pdf", "--outdir", outDir, f.path], { timeout: 120000 });
        } catch (e) {
          throw new Error("Konversi PPTX gagal. Pastikan LibreOffice sudah terpasang di server. Detail: " + (e.stderr || e.message));
        }
        const converted = path.join(outDir, path.parse(f.originalname).name + ".pdf");
        if (!fs.existsSync(converted)) throw new Error("File PDF hasil konversi tidak ditemukan.");
        const pdfName = `${path.parse(f.filename).name}.pdf`;
        fs.copyFileSync(converted, path.join(UPLOAD_DIR, pdfName));
        fs.rmSync(outDir, { recursive: true, force: true });
        fs.unlinkSync(f.path);
        slides.push({ name: f.originalname, file: pdfName, type: "pdf", pages: 1 });
      } else if (ext === ".pdf") {
        slides.push({ name: f.originalname, file: f.filename, type: "pdf", pages: 1 });
      } else {
        slides.push({ name: f.originalname, file: f.filename, type: "image", pages: 1 });
      }
    }
    const old = readPresentation();
    const interval = Math.max(2, Math.min(120, Number(req.body.interval) || 7));
    const data = {
      title: String(req.body.title || "Presentasi Publik").slice(0, 100),
      interval,
      loop: req.body.loop !== "false",
      slides
    };
    // Bersihkan file presentasi sebelumnya agar penyimpanan tidak menumpuk.
    for (const s of old.slides || []) {
      const p = path.join(UPLOAD_DIR, path.basename(s.file));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    writePresentation(data);
    res.json({ ok: true, count: slides.length });
  } catch (err) {
    for (const f of uploaded) if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    res.status(500).json({ error: err.message || "Gagal memproses file." });
  }
});

app.use("/uploads", express.static(UPLOAD_DIR, { fallthrough: false }));
app.get("/admin", (_req, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));
app.get("/slide", (_req, res) => res.sendFile(path.join(ROOT, "public", "slide.html")));

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Terjadi kesalahan." });
});

app.listen(PORT, () => console.log(`Slideshow berjalan di http://localhost:${PORT}`));
