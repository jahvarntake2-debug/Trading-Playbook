import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DIST_DIR = path.join(process.cwd(), 'dist');
const sessions = new Map();

const defaultCockpit = {
  accountSize: 10000,
  fundedAccountSize: 100000,
  riskPercent: 1,
  maxDailyLossPercent: 5,
  maxDrawdownPercent: 10,
  theme: 'dark',
};

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(USERS_FILE)) {
    const demoPasswordHash = hashPassword('demo123');
    const initialUsers = [{
      id: 'demo-user',
      name: 'Demo Trader',
      email: 'demo@journal.local',
      passwordHash: demoPasswordHash,
      createdAt: new Date().toISOString(),
      cockpit: { ...defaultCockpit },
      trades: [],
    }];

    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
  }
}

function readUsers() {
  ensureStore();

  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'stock-journal-local-salt', 200000, 64, 'sha512').toString('hex');
}

function createId(prefix = 'id') {
  return `${prefix}-${crypto.randomBytes(16).toString('hex')}`;
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, userId);
  return token;
}

function getUserFromToken(token) {
  const userId = sessions.get(token);
  if (!userId) {
    return null;
  }

  const users = readUsers();
  return users.find((user) => user.id === userId) ?? null;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  req.user = user;
  next();
}

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Trading journal API is live.' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedPassword = String(password).trim();

  if (!trimmedName || !trimmedEmail || trimmedPassword.length < 4) {
    return res.status(400).json({ error: 'Please provide a valid name, email, and password (minimum 4 characters).' });
  }

  const users = readUsers();
  const exists = users.some((user) => user.email.toLowerCase() === trimmedEmail);
  if (exists) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: createId('user'),
    name: trimmedName,
    email: trimmedEmail,
    passwordHash: hashPassword(trimmedPassword),
    createdAt: new Date().toISOString(),
    cockpit: { ...defaultCockpit },
    trades: [],
  };

  const nextUsers = [...users, newUser];
  writeUsers(nextUsers);

  const token = createSession(newUser.id);
  return res.status(201).json({ token, user: sanitizeUser(newUser) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = readUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  const match = users.find((user) => user.email.toLowerCase() === normalizedEmail && user.passwordHash === hashPassword(String(password).trim()));

  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = createSession(match.id);
  return res.json({ token, user: sanitizeUser(match) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = sanitizeUser(req.user);
  return res.json({ user });
});

app.get('/api/user', requireAuth, (req, res) => {
  const users = readUsers();
  const user = users.find((entry) => entry.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user: sanitizeUser(user) });
});

app.put('/api/user', requireAuth, (req, res) => {
  const { trades, cockpit } = req.body || {};
  const users = readUsers();
  const index = users.findIndex((user) => user.id === req.user.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const currentUser = users[index];
  const updatedUser = {
    ...currentUser,
    cockpit: cockpit ?? currentUser.cockpit,
    trades: Array.isArray(trades) ? trades : currentUser.trades,
  };

  users[index] = updatedUser;
  writeUsers(users);

  return res.json({ user: sanitizeUser(updatedUser) });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Trading journal app listening on http://localhost:${PORT}`);
});
