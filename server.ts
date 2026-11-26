import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

interface StoredLibrarianCreds {
  username: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

interface SessionPayload {
  sub: string;
  role: 'librarian';
  iat: number;
  exp: number;
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), '.data');
const CREDS_FILE = path.resolve(DATA_DIR, 'librarian-auth.json');
const SESSION_SECRET =
  process.env.LIBRARIAN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getEnvLibrarianCreds(): { username: string; password: string } | null {
  const username = (process.env.LIBRARIAN_USERNAME || '').trim();
  const password = process.env.LIBRARIAN_PASSWORD || '';
  if (username.length > 0 && password.length > 0) {
    return { username, password };
  }
  return null;
}

function readStoredCreds(): StoredLibrarianCreds | null {
  try {
    if (!fs.existsSync(CREDS_FILE)) return null;
    const raw = fs.readFileSync(CREDS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoredLibrarianCreds;
    if (
      typeof parsed.username === 'string' &&
      typeof parsed.salt === 'string' &&
      typeof parsed.passwordHash === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredCreds(creds: StoredLibrarianCreds): void {
  ensureDataDir();
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

function hashPassword(password: string, saltHex: string): string {
  return crypto.scryptSync(password, saltHex, 64).toString('hex');
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyStoredPassword(password: string, creds: StoredLibrarianCreds): boolean {
  const candidate = hashPassword(password, creds.salt);
  return safeEqualStrings(candidate, creds.passwordHash);
}

function validateUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 40) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}

function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.length < 6 || raw.length > 128) return null;
  return raw;
}

function signSessionToken(username: string): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: username,
    role: 'librarian',
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(authHeader: string | undefined): SessionPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  if (!safeEqualStrings(sig, expectedSig)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as SessionPayload;
    if (
      parsed.role !== 'librarian' ||
      typeof parsed.sub !== 'string' ||
      typeof parsed.exp !== 'number' ||
      Date.now() > parsed.exp
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/librarian/status', (_req, res) => {
    const envCreds = getEnvLibrarianCreds();
    if (envCreds) {
      res.json({
        configured: true,
        needsSetup: false,
        usingEnvOverride: true,
      });
      return;
    }
    const stored = readStoredCreds();
    res.json({
      configured: Boolean(stored),
      needsSetup: !stored,
      usingEnvOverride: false,
    });
  });

  app.post('/api/librarian/setup', (req, res) => {
    const envCreds = getEnvLibrarianCreds();
    if (envCreds || readStoredCreds()) {
      res.status(409).json({
        error: 'Akun pustakawan sudah dikonfigurasi. Silakan masuk dengan username dan password Anda.',
      });
      return;
    }

    const username = validateUsername(req.body?.username);
    const password = validatePassword(req.body?.password);
    if (!username) {
      res.status(400).json({
        error: 'Username harus 3–40 karakter (huruf, angka, titik, garis bawah, atau tanda hubung).',
      });
      return;
    }
    if (!password) {
      res.status(400).json({
        error: 'Password minimal 6 karakter.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    writeStoredCreds({
      username,
      salt,
      passwordHash,
      updatedAt: new Date().toISOString(),
    });

    const token = signSessionToken(username);
    res.status(201).json({
      token,
      username,
      usingEnvOverride: false,
    });
  });

  app.post('/api/librarian/login', (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi.' });
      return;
    }

    const envCreds = getEnvLibrarianCreds();
    if (envCreds) {
      const valid =
        safeEqualStrings(username, envCreds.username) &&
        safeEqualStrings(password, envCreds.password);
      if (!valid) {
        res.status(401).json({ error: 'Username atau password pustakawan tidak sesuai.' });
        return;
      }
      res.json({
        token: signSessionToken(envCreds.username),
        username: envCreds.username,
        usingEnvOverride: true,
      });
      return;
    }

    const stored = readStoredCreds();
    if (!stored) {
      res.status(409).json({
        error: 'Akun pustakawan belum dibuat. Silakan lakukan pengaturan awal terlebih dahulu.',
      });
      return;
    }

    const valid =
      safeEqualStrings(username, stored.username) &&
      verifyStoredPassword(password, stored);
    if (!valid) {
      res.status(401).json({ error: 'Username atau password pustakawan tidak sesuai.' });
      return;
    }

    res.json({
      token: signSessionToken(stored.username),
      username: stored.username,
      usingEnvOverride: false,
    });
  });

  app.get('/api/librarian/session', (req, res) => {
    const session = verifySessionToken(req.headers.authorization);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      username: session.sub,
      usingEnvOverride: Boolean(getEnvLibrarianCreds()),
    });
  });

  app.post('/api/librarian/credentials', (req, res) => {
    const session = verifySessionToken(req.headers.authorization);
    if (!session) {
      res.status(401).json({ error: 'Sesi pustakawan tidak valid atau sudah kedaluwarsa.' });
      return;
    }

    if (getEnvLibrarianCreds()) {
      res.status(400).json({
        error: 'Kredensial saat ini dikunci oleh variabel lingkungan LIBRARIAN_USERNAME / LIBRARIAN_PASSWORD.',
      });
      return;
    }

    const stored = readStoredCreds();
    if (!stored) {
      res.status(404).json({ error: 'Data kredensial pustakawan tidak ditemukan.' });
      return;
    }

    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newUsername = validateUsername(req.body?.newUsername);
    const newPassword = validatePassword(req.body?.newPassword);

    if (!verifyStoredPassword(currentPassword, stored)) {
      res.status(401).json({ error: 'Password saat ini tidak sesuai.' });
      return;
    }
    if (!newUsername) {
      res.status(400).json({
        error: 'Username baru harus 3–40 karakter (huruf, angka, titik, garis bawah, atau tanda hubung).',
      });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(newPassword, salt);
    writeStoredCreds({
      username: newUsername,
      salt,
      passwordHash,
      updatedAt: new Date().toISOString(),
    });

    const token = signSessionToken(newUsername);
    res.json({
      token,
      username: newUsername,
    });
  });

  app.post('/api/librarian/logout', (_req, res) => {
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CeriLib server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
