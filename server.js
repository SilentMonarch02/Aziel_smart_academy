import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const db = new Database(path.join(__dirname, 'data', 'aziel.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
  imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], fontSrc: ["'self'"],
  objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"]
}}}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const clean = (v, max=1500) => String(v ?? '').trim().slice(0, max);
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const mailConfigured = () => process.env.SMTP_HOST && process.env.NOTIFICATION_EMAIL;

async function notifyAdmin(row) {
  if (!mailConfigured()) return;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `New ${row.type} enquiry — ${row.full_name}`,
    text: `Name: ${row.full_name}\nEmail: ${row.email}\nPhone: ${row.phone}\nSubject: ${row.subject}\nMessage: ${row.message}\nReceived: ${row.created_at}`
  });
}

app.post('/api/enquiries', formLimiter, async (req, res) => {
  // Honeypot field helps filter basic automated spam.
  if (clean(req.body.website, 200)) return res.json({ ok: true, message: 'Thank you. Your message has been received.' });
  const type = ['admission', 'contact'].includes(clean(req.body.type, 20)) ? clean(req.body.type, 20) : 'contact';
  const row = {
    type,
    full_name: clean(req.body.fullName, 120),
    email: clean(req.body.email, 180).toLowerCase(),
    phone: clean(req.body.phone, 40),
    subject: clean(req.body.subject, 160),
    message: clean(req.body.message, 2000)
  };
  if (row.full_name.length < 2 || !emailOk(row.email) || row.phone.length < 7 || row.message.length < 10) {
    return res.status(400).json({ ok: false, message: 'Please complete all required fields with valid details.' });
  }
  const result = db.prepare(`INSERT INTO enquiries (type, full_name, email, phone, subject, message)
    VALUES (@type, @full_name, @email, @phone, @subject, @message)`).run(row);
  const saved = db.prepare('SELECT id, type, full_name, email, phone, subject, message, created_at FROM enquiries WHERE id = ?').get(result.lastInsertRowid);
  try { await notifyAdmin(saved); } catch (err) { console.error('Email notification failed:', err.message); }
  res.status(201).json({ ok: true, message: 'Thank you. Your enquiry has been received. Our team will get back to you.' });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Aziel Smart Academy website' }));
app.get('/api/admin/enquiries', (req, res) => {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('authorization') !== `Bearer ${key}`) return res.status(401).json({ ok: false, message: 'Unauthorised' });
  const rows = db.prepare('SELECT id, type, full_name, email, phone, subject, message, created_at FROM enquiries ORDER BY id DESC LIMIT 300').all();
  res.json({ ok: true, enquiries: rows });
});
app.get('/api/admin/export.csv', (req, res) => {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('authorization') !== `Bearer ${key}`) return res.status(401).send('Unauthorised');
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
  const fields = ['id','type','full_name','email','phone','subject','message','created_at'];
  const csv = [fields.join(','), ...rows.map(r => fields.map(k => `"${String(r[k] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aziel-enquiries.csv"');
  res.send(csv);
});

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));
app.listen(port, () => console.log(`Aziel Smart Academy website running on http://localhost:${port}`));
