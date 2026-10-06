import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Button, FileButton } from './components/Button';
import { TradingOverview } from './components/TradingOverview';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Direction = 'Long' | 'Short';
type PositionSizeUnit = 'shares' | 'mini' | 'micro';
type Page = 'dashboard' | 'analytics' | 'calculator' | 'tradovate';
type Theme = 'dark' | 'light';

const COMMON_MISTAKES = [
  'FOMO',
  'Revenge Trading',
  'Moved Stop Loss',
  'Early Exit',
  'Overconfidence',
  'Overtrading',
  'Poor Risk Management',
  'Chasing Earnings',
];

const PIE_COLORS = ['#22d3ee', '#8b5cf6', '#34d399', '#fbbf24', '#f87171', '#60a5fa'];
const PLUTCHIK_EMOTIONS = [
  { name: 'Joy', angle: -Math.PI / 2, opposite: 'Sadness', color: '#fbbf24' },
  { name: 'Trust', angle: -Math.PI / 4, opposite: 'Disgust', color: '#34d399' },
  { name: 'Fear', angle: 0, opposite: 'Anger', color: '#60a5fa' },
  { name: 'Surprise', angle: Math.PI / 4, opposite: 'Anticipation', color: '#a78bfa' },
  { name: 'Sadness', angle: Math.PI / 2, opposite: 'Joy', color: '#38bdf8' },
  { name: 'Disgust', angle: (3 * Math.PI) / 4, opposite: 'Trust', color: '#f87171' },
  { name: 'Anger', angle: Math.PI, opposite: 'Fear', color: '#fb923c' },
  { name: 'Anticipation', angle: (5 * Math.PI) / 4, opposite: 'Surprise', color: '#c084fc' },
];

const NAV_ITEMS: Array<{ id: Page; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'calculator', label: 'Position Size' },
  { id: 'tradovate', label: 'Tradovate' },
];

type Trade = {
  id: string;
  timestamp: string;
  ticker: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  positionSizeUnit: PositionSizeUnit;
  stopLoss: number;
  takeProfit: number;
  netPnl: number;
  strategyTags: string;
  emotionalState: string;
  notes: string;
  reflections: string;
  mistakes: string[];
};

type TradovateOrderStatus = 'Queued (demo)' | 'Filled (demo)' | 'Partial (demo)' | 'Closed (demo)';

type TradovateOrder = {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  quantity: number;
  orderType: 'Market' | 'Limit';
  limitPrice: number;
  stopPrice: number;
  timestamp: string;
  status: TradovateOrderStatus;
};

type DraftTrade = {
  timestamp: string;
  ticker: string;
  direction: Direction;
  entryPrice: number | string;
  exitPrice: number | string;
  positionSize: number | string;
  positionSizeUnit: PositionSizeUnit;
  stopLoss: number | string;
  takeProfit: number | string;
  netPnl: number;
  strategyTags: string;
  emotionalState: string;
  notes: string;
  reflections: string;
  mistakes: string[];
};

type TickerSnapshot = {
  symbol: string;
  name: string;
  price: number | null;
  atr: number | null;
  source: string;
  lastUpdated: string;
};

type CockpitSettings = {
  accountSize: number;
  fundedAccountSize: number;
  riskPercent: number;
  maxDailyLossPercent: number;
  maxDrawdownPercent: number;
  theme: Theme;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  cockpit: CockpitSettings;
  trades: Trade[];
};

const STORAGE_KEY = 'stock-trading-journal-v1';
const USERS_KEY = 'stock-trading-journal-users-v1';
const CURRENT_USER_KEY = 'stock-trading-journal-current-user-v1';
const AUTH_TOKEN_KEY = 'stock-trading-journal-auth-token-v1';
const API_BASE_URL = `${(import.meta.env.VITE_API_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'))}/api`;
const TRADOVATE_SESSION_KEY = 'stock-journal-tradovate-session';
const TRADOVATE_ORDERS_KEY = 'stock-journal-tradovate-orders';
const POSITION_SIZE_MULTIPLIERS: Record<PositionSizeUnit, number> = {
  shares: 1,
  mini: 10,
  micro: 100,
};
const TRADOVATE_ORDER_STATUSES: TradovateOrderStatus[] = ['Queued (demo)', 'Filled (demo)', 'Partial (demo)', 'Closed (demo)'];

const defaultCockpitSettings: CockpitSettings = {
  accountSize: 10000,
  fundedAccountSize: 100000,
  riskPercent: 1,
  maxDailyLossPercent: 5,
  maxDrawdownPercent: 10,
  theme: 'dark',
};

const initialTrades: Trade[] = [];

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const authToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function createDemoUser(): UserProfile {
  return {
    id: 'demo-user',
    name: 'Demo Trader',
    email: 'demo@journal.local',
    password: 'demo123',
    createdAt: new Date().toISOString(),
    cockpit: { ...defaultCockpitSettings },
    trades: initialTrades,
  };
}

function loadUsersFromStorage(): UserProfile[] {
  if (typeof window === 'undefined') {
    return [createDemoUser()];
  }

  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) as UserProfile[] : [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore malformed data and continue with default user
  }

  const fallback = [createDemoUser()];
  localStorage.setItem(USERS_KEY, JSON.stringify(fallback));
  return fallback;
}

const emptyDraft: DraftTrade = {
  timestamp: new Date().toISOString().slice(0, 16),
  ticker: '',
  direction: 'Long',
  entryPrice: '',
  exitPrice: '',
  positionSize: '',
  positionSizeUnit: 'shares',
  stopLoss: '',
  takeProfit: '',
  netPnl: 0,
  strategyTags: '',
  emotionalState: '',
  notes: '',
  reflections: '',
  mistakes: [],
};

function calculateNetPnl(trade: DraftTrade) {
  const entryPrice = Number(trade.entryPrice);
  const exitPrice = Number(trade.exitPrice);
  const positionSize = Number(trade.positionSize);
  const positionMultiplier = POSITION_SIZE_MULTIPLIERS[trade.positionSizeUnit ?? 'shares'] ?? 1;

  if (!entryPrice || !exitPrice || !positionSize) {
    return 0;
  }

  const effectivePositionSize = positionSize * positionMultiplier;
  const gross = trade.direction === 'Long'
    ? (exitPrice - entryPrice) * effectivePositionSize
    : (entryPrice - exitPrice) * effectivePositionSize;

  return Number(gross.toFixed(2));
}

function advanceTradovateOrderStatus(status: TradovateOrderStatus): TradovateOrderStatus {
  const currentIndex = TRADOVATE_ORDER_STATUSES.indexOf(status);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % TRADOVATE_ORDER_STATUSES.length : 0;
  return TRADOVATE_ORDER_STATUSES[nextIndex];
}

function createId(prefix = 'id') {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${randomPart}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getLossLevel(loss: number, maxLoss: number) {
  const ratio = maxLoss > 0 ? loss / maxLoss : 0;

  if (ratio >= 0.75) {
    return { label: 'Critical', tone: 'rose' };
  }

  if (ratio >= 0.5) {
    return { label: 'High', tone: 'orange' };
  }

  if (ratio >= 0.25) {
    return { label: 'Moderate', tone: 'amber' };
  }

  return { label: 'Low', tone: 'emerald' };
}

function normalizeEmotionState(state: string) {
  const value = state.trim().toLowerCase();

  if (/joy|happy|excited|euphoric|optimistic|confident/.test(value)) {
    return 'Joy';
  }

  if (/trust|calm|focused|disciplined|steady|composed/.test(value)) {
    return 'Trust';
  }

  if (/fear|anxious|nervous|cautious|hesitant|uncertain/.test(value)) {
    return 'Fear';
  }

  if (/surprise|surprised|shocked|unexpected/.test(value)) {
    return 'Surprise';
  }

  if (/sad|sadness|disappointed|down|regret|discouraged/.test(value)) {
    return 'Sadness';
  }

  if (/disgust|repulsed|revolted|aversion/.test(value)) {
    return 'Disgust';
  }

  if (/anger|angry|impatient|rage|frustrated|impulsive|revenge/.test(value)) {
    return 'Anger';
  }

  if (/anticipation|anticipating|expectant|hopeful|waiting|prepared/.test(value)) {
    return 'Anticipation';
  }

  return 'Joy';
}

function calculateAtrFromSeries(series: Record<string, any> | undefined) {
  if (!series) {
    return null;
  }

  const entries = Object.entries(series)
    .slice(0, 15)
    .map(([date, values]) => ({
      date,
      high: Number(values['2. high']),
      low: Number(values['3. low']),
      close: Number(values['4. close']),
    }))
    .reverse();

  const ranges = entries.slice(1).map((entry, index) => {
    const previous = entries[index];
    return Math.max(
      entry.high - entry.low,
      Math.abs(entry.high - previous.close),
      Math.abs(entry.low - previous.close),
    );
  });

  if (ranges.length === 0) {
    return null;
  }

  const average = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
  return Number(average.toFixed(2));
}

function calculateSimpleAtrFromQuote(payload: Record<string, any> | undefined) {
  if (!payload) {
    return null;
  }

  const high = Number(payload.high ?? 0);
  const low = Number(payload.low ?? 0);
  const close = Number(payload.close ?? payload.previous_close ?? 0);
  const previousClose = Number(payload.previous_close ?? close ?? 0);

  if (!high || !low || !close) {
    return null;
  }

  const ranges = [
    high - low,
    Math.abs(high - previousClose),
    Math.abs(low - previousClose),
  ];

  const average = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
  return Number(average.toFixed(2));
}

async function fetchAlphaVantage(functionQuery: string) {
  const url = `https://www.alphavantage.co/query?function=${functionQuery}&apikey=demo`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Unable to load market data');
  }

  return response.json();
}

async function fetchTwelveDataQuote(symbol: string) {
  const response = await fetch(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=demo`);

  if (!response.ok) {
    throw new Error('Unable to load fallback market data');
  }

  return response.json();
}

async function fetchTickerSnapshot(symbol: string): Promise<TickerSnapshot | null> {
  if (!symbol.trim()) {
    return null;
  }

  const querySymbol = symbol.trim().toUpperCase();

  try {
    const quoteResponse = await fetchAlphaVantage(`GLOBAL_QUOTE&symbol=${querySymbol}`);
    const quotePayload = quoteResponse['Global Quote'];

    if (!quotePayload || !quotePayload['05. price']) {
      throw new Error('Alpha Vantage quote unavailable');
    }

    const overviewResponse = await fetchAlphaVantage(`OVERVIEW&symbol=${querySymbol}`);
    const dailyResponse = await fetchAlphaVantage(`TIME_SERIES_DAILY&symbol=${querySymbol}&outputsize=compact`);
    const dailySeries = dailyResponse['Time Series (Daily)'];

    const price = Number(quotePayload['05. price'] ?? 0) || null;
    const name = overviewResponse?.Name || querySymbol;
    const atr = calculateAtrFromSeries(dailySeries);

    return {
      symbol: querySymbol,
      name,
      price,
      atr,
      source: 'Alpha Vantage demo',
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    try {
      const fallbackQuote = await fetchTwelveDataQuote(querySymbol);
      const price = Number(fallbackQuote.close ?? fallbackQuote.last ?? fallbackQuote.price ?? 0) || null;

      return {
        symbol: querySymbol,
        name: fallbackQuote.name || querySymbol,
        price,
        atr: calculateSimpleAtrFromQuote(fallbackQuote),
        source: 'Twelve Data demo fallback',
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}

function parseCsvTrade(row: string[]) {
  const [timestamp, ticker, direction, entryPrice, exitPrice, positionSize, positionSizeUnit, stopLoss, takeProfit, netPnl, strategyTags, emotionalState, notes, reflections, mistakes] = row;

  const parsedDirection = direction === 'Short' ? 'Short' : 'Long';
  const parsedMistakes = mistakes ? mistakes.split(';').map((item) => item.trim()).filter(Boolean) : [];
  const resolvedPositionUnit = (positionSizeUnit === 'mini' || positionSizeUnit === 'micro') ? positionSizeUnit : 'shares';

  const draftTrade: DraftTrade = {
    timestamp: timestamp || new Date().toISOString(),
    ticker: (ticker || '').toUpperCase(),
    direction: parsedDirection,
    entryPrice: Number(entryPrice) || 0,
    exitPrice: Number(exitPrice) || 0,
    positionSize: Number(positionSize) || 0,
    positionSizeUnit: resolvedPositionUnit,
    stopLoss: Number(stopLoss) || 0,
    takeProfit: Number(takeProfit) || 0,
    netPnl: Number(netPnl) || 0,
    strategyTags: strategyTags || '',
    emotionalState: emotionalState || '',
    notes: notes || '',
    reflections: reflections || '',
    mistakes: parsedMistakes,
  };

  const parsedTrade: Trade = {
    id: createId('trade'),
    timestamp: draftTrade.timestamp,
    ticker: draftTrade.ticker,
    direction: draftTrade.direction,
    entryPrice: Number(draftTrade.entryPrice) || 0,
    exitPrice: Number(draftTrade.exitPrice) || 0,
    positionSize: Number(draftTrade.positionSize) || 0,
    positionSizeUnit: draftTrade.positionSizeUnit ?? 'shares',
    stopLoss: Number(draftTrade.stopLoss) || 0,
    takeProfit: Number(draftTrade.takeProfit) || 0,
    netPnl: Number(netPnl) || calculateNetPnl(draftTrade),
    strategyTags: draftTrade.strategyTags,
    emotionalState: draftTrade.emotionalState,
    notes: draftTrade.notes,
    reflections: draftTrade.reflections,
    mistakes: draftTrade.mistakes,
  };

  return parsedTrade;
}

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [tradovateConnected, setTradovateConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem('stock-journal-tradovate') === 'true';
  });
  const [tradovateSession, setTradovateSession] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        username: 'demo-user',
        account: 'SIM-TRA-1001',
        environment: 'Paper',
      };
    }

    try {
      const storedSession = localStorage.getItem(TRADOVATE_SESSION_KEY);
      if (storedSession) {
        return JSON.parse(storedSession) as { username: string; account: string; environment: string };
      }
    } catch {
      // Ignore malformed persisted session state and fall through to defaults.
    }

    return {
      username: 'demo-user',
      account: 'SIM-TRA-1001',
      environment: 'Paper',
    };
  });
  const [tradovateOrderForm, setTradovateOrderForm] = useState<{
    symbol: string;
    side: 'Buy' | 'Sell';
    orderType: 'Market' | 'Limit';
    quantity: number | string;
    limitPrice: number | string;
    stopPrice: number | string;
  }>({
    symbol: 'AAPL',
    side: 'Buy',
    orderType: 'Limit',
    quantity: '1',
    limitPrice: '',
    stopPrice: '',
  });
  const [tradovateOrders, setTradovateOrders] = useState<TradovateOrder[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storedOrders = localStorage.getItem(TRADOVATE_ORDERS_KEY);
      if (!storedOrders) {
        return [];
      }

      return JSON.parse(storedOrders) as TradovateOrder[];
    } catch {
      return [];
    }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const storedTheme = localStorage.getItem('stock-journal-theme');
    return storedTheme === 'light' ? 'light' : 'dark';
  });
  const [users, setUsers] = useState<UserProfile[]>(() => loadUsersFromStorage());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return localStorage.getItem(CURRENT_USER_KEY) ?? null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'demo@journal.local', password: 'demo123' });
  const [trades, setTrades] = useState<Trade[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];
    const userTrades = currentUser?.trades ?? [];
    return Array.isArray(userTrades) ? userTrades : [];
  });

  const currentUser = users.find((user) => user.id === currentUserId) ?? null;

  const [draft, setDraft] = useState<DraftTrade>(emptyDraft);
  const [tickerFilter, setTickerFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortKey, setSortKey] = useState<'timestamp' | 'netPnl' | 'ticker'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingTradovateDeleteId, setPendingTradovateDeleteId] = useState<string | null>(null);
  const [tickerInfo, setTickerInfo] = useState<TickerSnapshot | null>(null);
  const [isTickerLoading, setIsTickerLoading] = useState(false);
  const [tickerError, setTickerError] = useState('');
  const [positionCalc, setPositionCalc] = useState<{
    accountSize: number | string;
    riskPercent: number | string;
    fundedAccountSize: number | string;
    maxDailyLossPercent: number | string;
    maxDrawdownPercent: number | string;
    entryPrice: number | string;
    stopLoss: number | string;
  }>({
    accountSize: 10000,
    riskPercent: 1,
    fundedAccountSize: 100000,
    maxDailyLossPercent: 5,
    maxDrawdownPercent: 10,
    entryPrice: '',
    stopLoss: '',
  });

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      return;
    }

    void (async () => {
      try {
        const response = await apiRequest<{ user: UserProfile } | { error: string }>('/auth/me');
        const serverUser = 'user' in response ? response.user : null;

        if (serverUser) {
          setUsers((prev) => {
            const base = prev.some((user) => user.id === serverUser.id) ? prev : [...prev, serverUser];
            const next = base.map((user) => (user.id === serverUser.id ? serverUser : user));
            localStorage.setItem(USERS_KEY, JSON.stringify(next));
            return next;
          });
          setCurrentUserId(serverUser.id);
          setTrades(serverUser.trades ?? []);
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    if (!currentUserId) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return;
    }

    localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    setUsers((prev) => {
      const next = prev.map((user) => (user.id === currentUserId ? { ...user, trades } : user));
      localStorage.setItem(USERS_KEY, JSON.stringify(next));
      return next;
    });

    void (async () => {
      try {
        const rawUsers = localStorage.getItem(USERS_KEY);
        const safeUsers = rawUsers ? JSON.parse(rawUsers) as UserProfile[] : [];
        const activeUser = safeUsers.find((user: UserProfile) => user.id === currentUserId);

        if (!activeUser) {
          return;
        }

        await apiRequest<{ user: UserProfile }>('/user', {
          method: 'PUT',
          body: JSON.stringify({
            trades,
            cockpit: activeUser.cockpit,
          }),
        });
      } catch {
        // Fall back to local-only persistence if the API is unavailable.
      }
    })();
  }, [trades, currentUserId]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setTheme(currentUser.cockpit.theme);
    setPositionCalc((current) => ({
      ...current,
      accountSize: currentUser.cockpit.accountSize,
      fundedAccountSize: currentUser.cockpit.fundedAccountSize,
      riskPercent: currentUser.cockpit.riskPercent,
      maxDailyLossPercent: currentUser.cockpit.maxDailyLossPercent,
      maxDrawdownPercent: currentUser.cockpit.maxDrawdownPercent,
    }));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('stock-journal-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('stock-journal-tradovate', String(tradovateConnected));
  }, [tradovateConnected]);

  useEffect(() => {
    localStorage.setItem(TRADOVATE_SESSION_KEY, JSON.stringify(tradovateSession));
  }, [tradovateSession]);

  useEffect(() => {
    localStorage.setItem(TRADOVATE_ORDERS_KEY, JSON.stringify(tradovateOrders));
  }, [tradovateOrders]);

  useEffect(() => {
    setDraft((current) => ({ ...current, netPnl: calculateNetPnl(current) }));
  }, [draft.entryPrice, draft.exitPrice, draft.positionSize, draft.direction]);

  useEffect(() => {
    setPositionCalc((current) => ({
      ...current,
      entryPrice: draft.entryPrice ?? current.entryPrice,
      stopLoss: draft.stopLoss ?? current.stopLoss,
    }));
  }, [draft.entryPrice, draft.stopLoss]);

  useEffect(() => {
    const currentTicker = draft.ticker.trim();

    if (!currentTicker) {
      setTickerInfo(null);
      setTickerError('');
      return;
    }

    const timeoutId = setTimeout(() => {
      void (async () => {
        try {
          setIsTickerLoading(true);
          setTickerError('');
          const snapshot = await fetchTickerSnapshot(currentTicker);

          if (snapshot) {
            setTickerInfo(snapshot);

            if (snapshot.price !== null && !draft.entryPrice) {
              setDraft((current) => ({
                ...current,
                entryPrice: Number(snapshot.price?.toFixed(2)),
              }));
            }
          } else {
            setTickerInfo(null);
            setTickerError('Live data is temporarily unavailable. You can still log the trade manually.');
          }
        } catch {
          setTickerInfo(null);
          setTickerError('Live data is temporarily unavailable. You can still log the trade manually.');
        } finally {
          setIsTickerLoading(false);
        }
      })();
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [draft.ticker]);

  const tickerPriceMap = useMemo(() => {
    const map = trades.reduce<Record<string, number>>((acc, trade) => {
      const lastKnown = Number(trade.entryPrice) || Number(trade.exitPrice) || 0;
      if (!lastKnown) {
        return acc;
      }

      const current = acc[trade.ticker];
      acc[trade.ticker] = current ? Math.max(current, lastKnown) : lastKnown;
      return acc;
    }, {});

    if (tickerInfo?.symbol && tickerInfo.price !== null) {
      map[tickerInfo.symbol] = tickerInfo.price;
    }

    return map;
  }, [tickerInfo, trades]);

  const displayedTrades = useMemo(() => {
    const filtered = trades.filter((trade) => {
      const matchesTicker = tickerFilter ? trade.ticker.toLowerCase().includes(tickerFilter.toLowerCase()) : true;
      const matchesStart = startDate ? new Date(trade.timestamp) >= new Date(startDate) : true;
      const matchesEnd = endDate ? new Date(trade.timestamp) <= new Date(`${endDate}T23:59:59`) : true;
      const matchesTag = tagFilter ? trade.strategyTags.toLowerCase().includes(tagFilter.toLowerCase()) : true;

      return matchesTicker && matchesStart && matchesEnd && matchesTag;
    });

    filtered.sort((a, b) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === 'ticker') {
        return a.ticker.localeCompare(b.ticker) * directionMultiplier;
      }

      if (sortKey === 'netPnl') {
        return (a.netPnl - b.netPnl) * directionMultiplier;
      }

      return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * directionMultiplier;
    });

    return filtered;
  }, [trades, tickerFilter, startDate, endDate, tagFilter, sortKey, sortDirection]);

  const metrics = useMemo(() => {
    const totalPnl = trades.reduce((sum, trade) => sum + trade.netPnl, 0);
    const wins = trades.filter((trade) => trade.netPnl > 0).length;
    const losses = trades.filter((trade) => trade.netPnl < 0).length;
    const totalTrades = trades.length || 1;
    const winRate = (wins / totalTrades) * 100;
    const grossProfit = trades.filter((trade) => trade.netPnl > 0).reduce((sum, trade) => sum + trade.netPnl, 0);
    const grossLoss = Math.abs(trades.filter((trade) => trade.netPnl < 0).reduce((sum, trade) => sum + trade.netPnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const avgWin = wins > 0
      ? trades.filter((trade) => trade.netPnl > 0).reduce((sum, trade) => sum + trade.netPnl, 0) / wins
      : 0;

    const avgLoss = losses > 0
      ? Math.abs(trades.filter((trade) => trade.netPnl < 0).reduce((sum, trade) => sum + trade.netPnl, 0) / losses)
      : 0;

    const avgTradeSize = trades.length > 0
      ? trades.reduce((sum, trade) => sum + trade.positionSize, 0) / trades.length
      : 0;

    return { totalPnl, winRate, profitFactor, avgWin, avgLoss, wins, losses, totalTrades, avgTradeSize };
  }, [trades]);

  const positionSizeMetrics = useMemo(() => {
    const accountSize = Number(positionCalc.accountSize || 0);
    const fundedAccountSize = Number(positionCalc.fundedAccountSize || 0);
    const riskPercent = Number(positionCalc.riskPercent || 0);
    const entryPrice = Number(positionCalc.entryPrice || 0);
    const stopLoss = Number(positionCalc.stopLoss || 0);
    const maxDailyLossPercent = Number(positionCalc.maxDailyLossPercent || 0);
    const maxDrawdownPercent = Number(positionCalc.maxDrawdownPercent || 0);

    if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
      return {
        riskAmount: 0,
        stopDistance: 0,
        suggestedSize: 0,
        baseRiskAmount: 0,
        propFirmCap: 0,
        fundedAccountSize,
      };
    }

    const baseRiskAmount = accountSize * (riskPercent / 100);
    const dailyLossCap = fundedAccountSize > 0 && maxDailyLossPercent > 0
      ? fundedAccountSize * (maxDailyLossPercent / 100)
      : 0;
    const drawdownCap = fundedAccountSize > 0 && maxDrawdownPercent > 0
      ? fundedAccountSize * (maxDrawdownPercent / 100)
      : 0;
    const propFirmCap = dailyLossCap > 0 || drawdownCap > 0 ? Math.min(dailyLossCap || Number.POSITIVE_INFINITY, drawdownCap || Number.POSITIVE_INFINITY) : 0;
    const riskAmount = fundedAccountSize > 0 && propFirmCap > 0 ? Math.min(baseRiskAmount, propFirmCap) : baseRiskAmount;
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const suggestedSize = stopDistance > 0 ? riskAmount / stopDistance : 0;

    return {
      riskAmount,
      stopDistance,
      suggestedSize,
      baseRiskAmount,
      propFirmCap,
      fundedAccountSize,
    };
  }, [positionCalc]);

  const analytics = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const equityCurve = sortedTrades.reduce<Array<{ label: string; cumulativePnl: number; date: string }>>((acc, trade) => {
      const previous = acc[acc.length - 1]?.cumulativePnl ?? 0;
      acc.push({
        label: new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulativePnl: Number((previous + trade.netPnl).toFixed(2)),
        date: trade.timestamp,
      });
      return acc;
    }, []);

    const emotionLossEntries = Object.entries(
      trades.reduce<Record<string, { loss: number; wins: number }>>((acc, trade) => {
        if (!trade.emotionalState) {
          return acc;
        }

        const normalizedEmotion = normalizeEmotionState(trade.emotionalState);
        const existing = acc[normalizedEmotion] ?? { loss: 0, wins: 0 };

        if (trade.netPnl >= 0) {
          existing.wins += 1;
        } else {
          existing.loss += Math.abs(trade.netPnl);
        }

        acc[normalizedEmotion] = existing;
        return acc;
      }, {}),
    )
      .map(([state, stats]) => ({ state, ...stats }))
      .sort((a, b) => b.loss - a.loss);

    const maxEmotionLoss = Math.max(...emotionLossEntries.map((item) => item.loss), 1);
    const emotionLossData = emotionLossEntries.map((item) => ({
      ...item,
      level: getLossLevel(item.loss, maxEmotionLoss),
    }));

    const mistakeLossEntries = Object.entries(
      trades.reduce<Record<string, number>>((acc, trade) => {
        if (trade.netPnl >= 0) {
          return acc;
        }

        trade.mistakes.forEach((mistake) => {
          acc[mistake] = (acc[mistake] || 0) + Math.abs(trade.netPnl);
        });

        return acc;
      }, {}),
    )
      .map(([mistake, loss]) => ({ mistake, loss }))
      .sort((a, b) => b.loss - a.loss);

    const maxMistakeLoss = Math.max(...mistakeLossEntries.map((item) => item.loss), 1);
    const mistakeLossData = mistakeLossEntries.map((item) => ({
      ...item,
      level: getLossLevel(item.loss, maxMistakeLoss),
    }));

    const tickerDistributionData = Object.entries(
      trades.reduce<Record<string, { count: number; totalPnl: number }>>((acc, trade) => {
        const existing = acc[trade.ticker] ?? { count: 0, totalPnl: 0 };
        acc[trade.ticker] = {
          count: existing.count + 1,
          totalPnl: existing.totalPnl + trade.netPnl,
        };
        return acc;
      }, {}),
    )
      .map(([ticker, stats]) => ({ name: ticker, value: stats.count, totalPnl: stats.totalPnl }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const mistakeFrequencyData = Object.entries(
      trades.reduce<Record<string, { count: number; totalPnl: number }>>((acc, trade) => {
        trade.mistakes.forEach((mistake) => {
          const existing = acc[mistake] ?? { count: 0, totalPnl: 0 };
          acc[mistake] = {
            count: existing.count + 1,
            totalPnl: existing.totalPnl + trade.netPnl,
          };
        });

        return acc;
      }, {}),
    )
      .map(([mistake, stats]) => ({ name: mistake, value: stats.count, totalPnl: stats.totalPnl }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const bestTrade = [...trades].sort((a, b) => b.netPnl - a.netPnl)[0] ?? null;
    const worstTrade = [...trades].sort((a, b) => a.netPnl - b.netPnl)[0] ?? null;

    return { equityCurve, emotionLossData, mistakeLossData, tickerDistributionData, mistakeFrequencyData, bestTrade, worstTrade };
  }, [trades]);

  const dashboardInsights = useMemo(() => {
    if (trades.length === 0) {
      return {
        avgTrade: 0,
        bestTrade: null,
        worstTrade: null,
      };
    }

    const avgTrade = trades.reduce((sum, trade) => sum + trade.netPnl, 0) / trades.length;
    return {
      avgTrade,
      bestTrade: [...trades].sort((a, b) => b.netPnl - a.netPnl)[0],
      worstTrade: [...trades].sort((a, b) => a.netPnl - b.netPnl)[0],
    };
  }, [trades]);

  const tradovateSimulation = useMemo(() => {
    const activeOrders = tradovateOrders.filter((order) => order.status !== 'Closed (demo)');

    const openPositions = activeOrders.map((order) => {
      const simulatedMarkPrice = order.limitPrice || (order.orderType === 'Market' ? Number(tickerInfo?.price ?? 0) || 100 : 100);
      const priceImpact = Math.max(simulatedMarkPrice * 0.015, 0.5);
      const pnl = order.side === 'Buy'
        ? order.quantity * priceImpact
        : -order.quantity * priceImpact;

      return {
        id: order.id,
        ticker: order.symbol,
        direction: order.side === 'Buy' ? 'Long' : 'Short',
        size: order.quantity,
        pnl,
        orderType: order.orderType,
        status: order.status,
      };
    });

    return {
      endpoint: 'https://tradovateapi.com',
      accountId: tradovateSession.account,
      sessionName: `${tradovateSession.environment} Session`,
      connectedSymbols: [...new Set([...trades.slice(0, 6).map((trade) => trade.ticker), ...tradovateOrders.map((order) => order.symbol)])],
      openPositions,
      runningPnl: openPositions.reduce((sum, position) => sum + position.pnl, 0),
      status: tradovateConnected
        ? `Connected to simulated Tradovate sandbox as ${tradovateSession.username}`
        : 'Sandbox ready — connect to simulate a Tradovate session',
    };
  }, [trades, tradovateConnected, tradovateOrders, tradovateSession, tickerInfo]);

  const handleChange = (field: keyof DraftTrade, value: string | number | string[]) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleNumericInput = (field: keyof DraftTrade, rawValue: string) => {
    setDraft((current) => ({
      ...current,
      [field]: rawValue,
    }));
  };

  const toggleMistake = (mistake: string) => {
    setDraft((current) => {
      const exists = current.mistakes.includes(mistake);
      return {
        ...current,
        mistakes: exists ? current.mistakes.filter((item) => item !== mistake) : [...current.mistakes, mistake],
      };
    });
  };

  const handleTradovateOrder = (event: FormEvent) => {
    event.preventDefault();

    if (!tradovateConnected) {
      return;
    }

    const symbol = tradovateOrderForm.symbol.trim().toUpperCase();
    const quantity = Number(tradovateOrderForm.quantity) || 0;

    if (!symbol || quantity <= 0) {
      return;
    }

    const order: TradovateOrder = {
      id: createId('tradovate-order'),
      symbol,
      side: tradovateOrderForm.side,
      quantity,
      orderType: tradovateOrderForm.orderType,
      limitPrice: Number(tradovateOrderForm.limitPrice || 0),
      stopPrice: Number(tradovateOrderForm.stopPrice || 0),
      timestamp: new Date().toISOString(),
      status: tradovateOrderForm.orderType === 'Market' ? 'Filled (demo)' : 'Queued (demo)',
    };

    setTradovateOrders((current) => [order, ...current].slice(0, 8));
    setTradovateOrderForm((current) => ({
      ...current,
      quantity: 1,
      limitPrice: 0,
      stopPrice: 0,
    }));
  };

  const advanceOrderStatus = (orderId: string) => {
    setTradovateOrders((current) => current.map((order) => {
      if (order.id !== orderId) {
        return order;
      }

      return {
        ...order,
        status: advanceTradovateOrderStatus(order.status),
      };
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextTrade: Trade = {
      id: createId('trade'),
      ...draft,
      entryPrice: Number(draft.entryPrice) || 0,
      exitPrice: Number(draft.exitPrice) || 0,
      positionSize: Number(draft.positionSize) || 0,
      positionSizeUnit: draft.positionSizeUnit ?? 'shares',
      stopLoss: Number(draft.stopLoss) || 0,
      takeProfit: Number(draft.takeProfit) || 0,
      ticker: draft.ticker.trim().toUpperCase(),
      strategyTags: draft.strategyTags.trim(),
      emotionalState: draft.emotionalState.trim(),
      notes: draft.notes.trim(),
      reflections: draft.reflections.trim(),
      netPnl: calculateNetPnl(draft),
      mistakes: draft.mistakes,
    };

    setTrades((current) => [nextTrade, ...current]);
    setDraft({
      ...emptyDraft,
      timestamp: new Date().toISOString().slice(0, 16),
    });
  };

  const resetFilters = () => {
    setTickerFilter('');
    setStartDate('');
    setEndDate('');
    setTagFilter('');
  };

  const exportCsv = () => {
    const headers = [
      'timestamp',
      'ticker',
      'direction',
      'entryPrice',
      'exitPrice',
      'positionSize',
      'positionSizeUnit',
      'stopLoss',
      'takeProfit',
      'netPnl',
      'strategyTags',
      'emotionalState',
      'notes',
      'reflections',
      'mistakes',
    ];

    const csvRows = [headers.join(',')];

    trades.forEach((trade) => {
      const row = [
        trade.timestamp,
        trade.ticker,
        trade.direction,
        trade.entryPrice,
        trade.exitPrice,
        trade.positionSize,
        trade.positionSizeUnit,
        trade.stopLoss,
        trade.takeProfit,
        trade.netPnl,
        trade.strategyTags,
        trade.emotionalState,
        trade.notes,
        trade.reflections,
        trade.mistakes.join(';'),
      ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
      csvRows.push(row);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stock-journal-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return;
    }

    const header = lines[0].split(',').map((value) => value.replace(/"/g, '').trim());
    const importedTrades = lines.slice(1).map((line) => {
      const columns = line.match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g) || [];
      const trimmedColumns = columns.map((value) => value.replace(/^"|"$/g, '').replace(/""/g, '"'));
      const row = new Array(header.length).fill('');
      for (let index = 0; index < trimmedColumns.length; index += 1) {
        row[index] = trimmedColumns[index] || '';
      }
      return parseCsvTrade(row);
    }).filter((trade) => trade.ticker && trade.entryPrice && trade.exitPrice);

    if (importedTrades.length > 0) {
      setTrades(importedTrades);
    }

    event.target.value = '';
  };

  const handleRemoveTrade = (tradeId: string) => {
    setTrades((current) => current.filter((trade) => trade.id !== tradeId));
    setPendingDeleteId(null);
  };

  const handleRemoveTradovateOrder = (orderId: string) => {
    setTradovateOrders((current) => current.filter((order) => order.id !== orderId));
    setPendingTradovateDeleteId(null);
  };

  const hasActiveFilters = Boolean(tickerFilter || startDate || endDate || tagFilter);

  const renderTradovate = () => (
    <section className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Tradovate simulation</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Sandbox Environment</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTradovateConnected((current) => !current)}
            >
              {tradovateConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Endpoint: <span className="font-medium text-cyan-300">{tradovateSimulation.endpoint}</span>
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Account" value={tradovateSimulation.accountId} />
              <SummaryTile label="Running P&L" value={formatCurrency(tradovateSimulation.runningPnl)} />
              <SummaryTile label="Symbols" value={String(tradovateSimulation.connectedSymbols.length)} />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session status</p>
              <p className="mt-2 text-lg font-medium text-white">{tradovateSimulation.status}</p>
              <p className="mt-1 text-sm text-slate-300">
                {tradovateConnected ? `${tradovateSimulation.sessionName} is active in demo mode.` : 'Mock connection is available for a sandbox workflow.'}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-white">Simulated Order Ticket</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${tradovateConnected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
              {tradovateConnected ? 'Ready' : 'Connect First'}
            </span>
          </div>

          <form onSubmit={handleTradovateOrder} className="grid gap-3 md:grid-cols-2">
            <Field label="Username">
              <input
                type="text"
                value={tradovateSession.username}
                onChange={(e) => setTradovateSession((current) => ({ ...current, username: e.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Account">
              <input
                type="text"
                value={tradovateSession.account}
                onChange={(e) => setTradovateSession((current) => ({ ...current, account: e.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Environment">
              <select
                value={tradovateSession.environment}
                onChange={(e) => setTradovateSession((current) => ({ ...current, environment: e.target.value }))}
                className="field"
              >
                <option value="Paper">Paper</option>
                <option value="Demo">Demo</option>
              </select>
            </Field>

            <Field label="Symbol">
              <input
                type="text"
                value={tradovateOrderForm.symbol}
                onChange={(e) => setTradovateOrderForm((current) => ({ ...current, symbol: e.target.value.toUpperCase() }))}
                className="field uppercase"
              />
            </Field>

            <Field label="Side">
              <select
                value={tradovateOrderForm.side}
                onChange={(e) => setTradovateOrderForm((current) => ({ ...current, side: e.target.value as 'Buy' | 'Sell' }))}
                className="field"
              >
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </Field>

            <Field label="Order Type">
              <select
                value={tradovateOrderForm.orderType}
                onChange={(e) => setTradovateOrderForm((current) => ({ ...current, orderType: e.target.value as 'Market' | 'Limit' }))}
                className="field"
              >
                <option value="Limit">Limit</option>
                <option value="Market">Market</option>
              </select>
            </Field>

            <Field label="Quantity">
              <input
                type="number"
                min="1"
                step="1"
                value={tradovateOrderForm.quantity}
                onChange={(e) => setTradovateOrderForm((current) => ({ ...current, quantity: e.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Limit Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={tradovateOrderForm.limitPrice}
                onChange={(e) => setTradovateOrderForm((current) => ({ ...current, limitPrice: e.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Stop Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={tradovateOrderForm.stopPrice}
                onChange={(e) => setTradovateOrderForm((current) => ({ ...current, stopPrice: e.target.value }))}
                className="field"
              />
            </Field>

            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={!tradovateConnected}
              >
                Send Simulated Order
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-white">Open Positions</h3>
          <div className="mt-4 space-y-3">
            {tradovateSimulation.openPositions.length > 0 ? (
              tradovateSimulation.openPositions.map((position) => (
                <div key={position.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{position.ticker}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{position.direction}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${position.pnl >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {formatCurrency(position.pnl)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-300">
                    <span>Size: {position.size}</span>
                    <span>{position.orderType}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => advanceOrderStatus(position.id)}
                    >
                      Advance Status
                    </Button>
                    {pendingTradovateDeleteId === position.id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTradovateOrder(position.id)}
                          aria-label={`Confirm delete ${position.ticker} position`}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          type="button"
                          variant="quiet"
                          size="sm"
                          onClick={() => setPendingTradovateDeleteId(null)}
                          aria-label={`Cancel deleting ${position.ticker} position`}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingTradovateDeleteId(position.id)}
                        aria-label={`Delete ${position.ticker} position`}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">No live simulated positions. Submit a demo order to seed the book.</p>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-white">Recent Orders</h3>
          <div className="mt-4 space-y-3">
            {tradovateOrders.length > 0 ? (
              tradovateOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{order.symbol}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{order.side} · {order.quantity} shares</p>
                    </div>
                    <span className="text-xs text-cyan-300">{order.status}</span>
                  </div>

                  <div className="mt-3 flex justify-between gap-3 text-sm text-slate-300">
                    <span>{order.orderType}</span>
                    <span>{formatDateTime(order.timestamp)}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => advanceOrderStatus(order.id)}
                    >
                      Cycle Status
                    </Button>
                    {pendingTradovateDeleteId === order.id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTradovateOrder(order.id)}
                          aria-label={`Confirm delete ${order.symbol} order`}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          type="button"
                          variant="quiet"
                          size="sm"
                          onClick={() => setPendingTradovateDeleteId(null)}
                          aria-label={`Cancel deleting ${order.symbol} order`}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingTradovateDeleteId(order.id)}
                        aria-label={`Delete ${order.symbol} order`}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">No demo orders yet. Use the ticket above to create a sandbox order.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderDashboard = () => (
    <>
      <TradingOverview
        trades={trades}
        metrics={metrics}
        formatCurrency={formatCurrency}
        onExportCsv={exportCsv}
        onClearFilters={resetFilters}
        onOpenJournal={() => document.getElementById('journal-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <section id="journal-workspace" className="dj-journal-workspace" aria-label="Journal workspace">
        <section aria-label="Performance metrics" className="dashboard-metrics">
        <MetricCard label="Total P&L" value={formatCurrency(metrics.totalPnl)} tone={metrics.totalPnl >= 0 ? 'positive' : 'negative'} />
        <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} tone="info" />
        <MetricCard label="Profit Factor" value={metrics.profitFactor.toFixed(2)} tone={metrics.profitFactor >= 1 ? 'positive' : 'negative'} />
        <MetricCard label="Average Win / Loss" value={`${formatCurrency(metrics.avgWin)} / ${formatCurrency(metrics.avgLoss)}`} tone="info" />
      </section>

      <section aria-label="Trade insights" className="dashboard-insights">
        <InsightCard
          title="Average Trade"
          value={formatCurrency(dashboardInsights.avgTrade)}
          tone={dashboardInsights.avgTrade >= 0 ? 'positive' : 'negative'}
          description="Mean performance across all logged trades"
        />
        <InsightCard
          title="Best Trade"
          value={dashboardInsights.bestTrade ? `${dashboardInsights.bestTrade.ticker} · ${formatCurrency(dashboardInsights.bestTrade.netPnl)}` : '—'}
          tone="positive"
          description={dashboardInsights.bestTrade ? formatDateTime(dashboardInsights.bestTrade.timestamp) : 'Log your first trade'}
        />
        <InsightCard
          title="Worst Trade"
          value={dashboardInsights.worstTrade ? `${dashboardInsights.worstTrade.ticker} · ${formatCurrency(dashboardInsights.worstTrade.netPnl)}` : '—'}
          tone="negative"
          description={dashboardInsights.worstTrade ? formatDateTime(dashboardInsights.worstTrade.timestamp) : 'Log your first trade'}
        />
      </section>

        <div className="dashboard-content-grid">
          <section className="dashboard-panel dashboard-record-panel">
          <div className="dashboard-panel-inner">
            <div className="dashboard-panel-heading">
              <h2>Record Trade</h2>
              <span className="dashboard-count-badge">
                {metrics.totalTrades} logged
              </span>
            </div>

          <div className="dashboard-ticker-callout">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm uppercase tracking-[0.2em] text-cyan-300">Live / Delayed Ticker Data</h3>
              {isTickerLoading ? (
                <span className="text-xs text-cyan-200">Refreshing...</span>
              ) : (
                <span className="text-xs text-slate-400">{tickerInfo?.source ?? 'Free demo feed'}</span>
              )}
            </div>

            {tickerError ? (
              <p className="text-sm text-amber-300">{tickerError}</p>
            ) : tickerInfo ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Asset</p>
                  <p className="mt-1 text-lg font-semibold text-white">{tickerInfo.name}</p>
                  <p className="text-sm text-cyan-300">{tickerInfo.symbol}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Price</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">{tickerInfo.price ? formatCurrency(tickerInfo.price) : 'N/A'}</p>
                  <p className="text-sm text-slate-300">{tickerInfo.atr ? `Daily ATR: ${formatCurrency(tickerInfo.atr)}` : 'ATR unavailable'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300">Type a ticker symbol to automatically enrich the trade with current price, company name, and ATR.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="dashboard-trade-form">
            <div className="dashboard-form-grid">
              <Field label="Date / Time">
                <input type="datetime-local" value={draft.timestamp} onChange={(e) => handleChange('timestamp', e.target.value)} className="field" />
              </Field>
              <Field label="Ticker Symbol">
                <input type="text" value={draft.ticker} onChange={(e) => handleChange('ticker', e.target.value)} className="field uppercase" placeholder="AAPL" />
              </Field>
              <Field label="Direction">
                <select value={draft.direction} onChange={(e) => handleChange('direction', e.target.value)} className="field">
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                </select>
              </Field>
              <Field label="Position Size">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.positionSize}
                    onChange={(e) => handleNumericInput('positionSize', e.target.value)}
                    className="field flex-1"
                    placeholder="0"
                  />
                  <select
                    value={draft.positionSizeUnit}
                    onChange={(e) => handleChange('positionSizeUnit', e.target.value as PositionSizeUnit)}
                    className="field min-w-[110px]"
                  >
                    <option value="shares">Shares</option>
                    <option value="mini">Mini</option>
                    <option value="micro">Micro</option>
                  </select>
                </div>
              </Field>
              <Field label="Entry Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.entryPrice}
                  onChange={(e) => handleNumericInput('entryPrice', e.target.value)}
                  className="field"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Exit Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.exitPrice}
                  onChange={(e) => handleNumericInput('exitPrice', e.target.value)}
                  className="field"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Stop-Loss">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.stopLoss}
                  onChange={(e) => handleNumericInput('stopLoss', e.target.value)}
                  className="field"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Take-Profit">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.takeProfit}
                  onChange={(e) => handleNumericInput('takeProfit', e.target.value)}
                  className="field"
                  placeholder="0.00"
                />
              </Field>
            </div>

            <div className="dashboard-pnl-callout">
              <div className="dashboard-pnl-content">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Net P&L</p>
                  <p className={`mt-1 text-2xl font-semibold ${draft.netPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatCurrency(draft.netPnl)}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-300">
                  <p>Live preview</p>
                  <p className="font-medium text-white">
                    {Number(draft.entryPrice) && Number(draft.exitPrice) && Number(draft.positionSize)
                      ? `${draft.direction === 'Long' ? 'Long' : 'Short'} move: ${formatCurrency(((Number(draft.exitPrice) - Number(draft.entryPrice)) * Number(draft.positionSize) * (POSITION_SIZE_MULTIPLIERS[draft.positionSizeUnit ?? 'shares'])) * (draft.direction === 'Long' ? 1 : -1))}`
                      : 'Enter entry, exit, and size to preview'}
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-form-grid dashboard-form-grid--meta">
              <Field label="Strategy / Setup Tags">
                <input type="text" value={draft.strategyTags} onChange={(e) => handleChange('strategyTags', e.target.value)} className="field" placeholder="Momentum, Breakout, FOMC" />
              </Field>
              <Field label="Emotional State / Mindset">
                <input type="text" value={draft.emotionalState} onChange={(e) => handleChange('emotionalState', e.target.value)} className="field" placeholder="Calm, impulsive, focused" />
              </Field>
            </div>

            <Field label="Mistake Tracking Matrix">
              <div className="dashboard-check-grid">
                {COMMON_MISTAKES.map((mistake) => (
                  <label key={mistake} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.mistakes.includes(mistake)}
                      onChange={() => toggleMistake(mistake)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-500"
                    />
                    {mistake}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="News / Fundamental Notes">
              <textarea value={draft.notes} onChange={(e) => handleChange('notes', e.target.value)} className="field min-h-24" placeholder="Add catalysts, macro context, earnings updates, or key notes..." />
            </Field>

            <Field label="Analytical Reflections">
              <textarea value={draft.reflections} onChange={(e) => handleChange('reflections', e.target.value)} className="field min-h-24" placeholder="Summarize what worked, what didn’t, and what to improve..." />
            </Field>

            <div className="dashboard-form-footer">
              <span className="dashboard-status">
                <span className="dashboard-status__dot" aria-hidden="true" />
                Ready to save
              </span>
              <Button type="submit" variant="primary" size="lg">
                Save Trade
              </Button>
            </div>
          </form>
          </div>
        </section>

        <section className="dashboard-panel dashboard-history-panel">
          <div className="dashboard-panel-inner">
          <div className="dashboard-history-heading">
              <div>
                <h2>Trade History</h2>
                <p className="dashboard-bottom-note">Review, filter, and protect your journal records.</p>
              </div>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                Clear filters
              </Button>
            </div>

            <div className="dashboard-filter-row">
              <input aria-label="Filter by ticker" value={tickerFilter} onChange={(e) => setTickerFilter(e.target.value)} className="field" placeholder="Filter by ticker" />
              <input aria-label="Filter from date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" />
              <input aria-label="Filter to date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field" />
              <input aria-label="Filter by strategy tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="field" placeholder="Strategy tag" />
            </div>

            <div aria-label="Sort controls" className="dashboard-sort-group">
              <select aria-label="Sort trades" value={sortKey} onChange={(e) => setSortKey(e.target.value as 'timestamp' | 'netPnl' | 'ticker')} className="field dashboard-sort-select">
                <option value="timestamp">Sort by date</option>
                <option value="netPnl">Sort by P&amp;L</option>
                <option value="ticker">Sort by ticker</option>
              </select>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                aria-pressed={sortDirection === 'desc'}
                onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
              >
                {sortDirection === 'asc' ? 'Ascending ↕' : 'Descending ↕'}
              </Button>
            </div>

            <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ticker</th>
                  <th>Direction</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>P&L</th>
                  <th>Tags</th>
                  <th className="dashboard-action-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedTrades.length > 0 ? (
                  displayedTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-800/70 align-top text-slate-200">
                      <td className="py-3 pr-4 text-slate-300">{formatDateTime(trade.timestamp)}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-white">{trade.ticker}</div>
                        {tickerPriceMap[trade.ticker] ? (
                          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                            {formatCurrency(tickerPriceMap[trade.ticker])}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${trade.direction === 'Long' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{formatCurrency(trade.entryPrice)}</td>
                      <td className="py-3 pr-4">{formatCurrency(trade.exitPrice)}</td>
                      <td className={`py-3 pr-4 font-semibold ${trade.netPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {formatCurrency(trade.netPnl)}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{trade.strategyTags || '—'}</td>
                      <td className="dashboard-action-cell">
                        {pendingDeleteId === trade.id ? (
                          <div className="flex min-h-11 items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveTrade(trade.id)}
                              aria-label={`Confirm delete ${trade.ticker} trade`}
                            >
                              Confirm delete
                            </Button>
                            <Button
                              type="button"
                              variant="quiet"
                              size="sm"
                              onClick={() => setPendingDeleteId(null)}
                              aria-label={`Cancel deleting ${trade.ticker} trade`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setPendingDeleteId(trade.id)}
                            aria-label={`Delete ${trade.ticker} trade`}
                          >
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No trades match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            <p className="dashboard-bottom-note">Buttons use a 44px minimum target, quiet neutrals for utilities, cyan for the active signal, and rose only for destructive confirmation.</p>
          </div>
          </section>
        </div>
      </section>
    </>
  );

  const renderAnalytics = () => (
    <>
      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Trade Distribution" subtitle="Most active symbols in your journal" footer="Top 6 tickers by volume">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.tickerDistributionData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={4}>
                  {analytics.tickerDistributionData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item.payload as { totalPnl?: number };
                    return [`${Number(value ?? 0)} trades • ${formatCurrency(payload.totalPnl ?? 0)}`, 'Trade mix'];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendList data={analytics.tickerDistributionData} />
        </ChartPanel>

        <ChartPanel title="Mistake Frequency" subtitle="Behavioral patterns that repeat" footer="Categories by occurrence">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.mistakeFrequencyData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={4}>
                  {analytics.mistakeFrequencyData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item.payload as { totalPnl?: number };
                    return [`${Number(value ?? 0)} occurrences • ${formatCurrency(payload.totalPnl ?? 0)}`, 'Mistake mix'];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendList data={analytics.mistakeFrequencyData} />
        </ChartPanel>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Emotional State Wheel" subtitle="Mood states tied to your outcomes across wins and losses" footer="Both winning and losing trades are included">
          <EmotionWheelChart data={analytics.emotionLossData} formatCurrency={formatCurrency} />
        </ChartPanel>

        <ChartPanel title="Equity Curve" subtitle="Cumulative performance over time" footer="Smooth trend of your journal">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.equityCurve}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Cumulative P&L']}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="cumulativePnl" stroke="#22d3ee" strokeWidth={3} fill="url(#equityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </section>

      <section className="glass-panel rounded-3xl p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">Mistake Tracking Matrix</h3>
            <p className="text-sm text-slate-400">Behavioral leak patterns and their cost impact</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {analytics.mistakeLossData.length > 0 ? (
            analytics.mistakeLossData.map((item) => {
              const occurrenceCount = analytics.mistakeFrequencyData.find((entry) => entry.name === item.mistake)?.value ?? 0;
              const maxLoss = Math.max(...analytics.mistakeLossData.map((metric) => metric.loss), 1);
              const levelTone = item.level.tone === 'rose'
                ? 'border-rose-500/40 bg-rose-500/10'
                : item.level.tone === 'orange'
                  ? 'border-orange-500/40 bg-orange-500/10'
                  : item.level.tone === 'amber'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-emerald-500/40 bg-emerald-500/10';

              return (
                <div key={item.mistake} className={`rounded-2xl border p-4 ${levelTone}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{item.mistake}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{occurrenceCount} occurrences</p>
                    </div>
                    <span className={`rounded-full border border-current/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${item.level.tone === 'rose' ? 'text-rose-300' : item.level.tone === 'orange' ? 'text-orange-300' : item.level.tone === 'amber' ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {item.level.label}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-200">
                    <span>Loss impact</span>
                    <span className="font-medium text-white">{formatCurrency(item.loss)}</span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800/80">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-cyan-400"
                      style={{ width: `${Math.min((item.loss / maxLoss) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-300">No mistake data yet. Start logging trades and tag behavioral mistakes to surface the pattern.</p>
          )}
        </div>
      </section>
    </>
  );

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = authForm.email.trim().toLowerCase();
    const normalizedName = authForm.name.trim();
    const password = authForm.password.trim();

    if (!normalizedEmail || !password) {
      return;
    }

    try {
      if (authMode === 'register') {
        if (!normalizedName) {
          return;
        }

        const response = await apiRequest<{ token: string; user: UserProfile }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: normalizedName, email: normalizedEmail, password }),
        });

        localStorage.setItem(AUTH_TOKEN_KEY, response.token);
        setUsers((prev) => {
          const updated = [...prev, response.user];
          localStorage.setItem(USERS_KEY, JSON.stringify(updated));
          return updated;
        });
        setCurrentUserId(response.user.id);
        setTrades(response.user.trades ?? []);
        setAuthForm({ name: '', email: '', password: '' });
        return;
      }

      const response = await apiRequest<{ token: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      setUsers((prev) => {
        const next = prev.some((user) => user.id === response.user.id) ? prev : [...prev, response.user];
        localStorage.setItem(USERS_KEY, JSON.stringify(next));
        return next;
      });
      setCurrentUserId(response.user.id);
      setTrades(response.user.trades ?? []);
      setAuthForm({ name: '', email: response.user.email, password: '' });
    } catch {
      // Keep the UI simple and allow the default user to continue when the API is unavailable.
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setCurrentUserId(null);
    setTrades([]);
    setDraft(emptyDraft);
    setAuthMode('login');
    setAuthForm({ name: '', email: 'demo@journal.local', password: 'demo123' });
  };

  const renderAuthScreen = () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/50">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Trading cockpit</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{authMode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {authMode === 'login' ? 'Sign in to access your trade journal and dashboard.' : 'Set up a personal trading cockpit with separate settings and trades.'}
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'register' && (
            <label className="block text-sm text-slate-300">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Full name</span>
              <input
                type="text"
                value={authForm.name}
                onChange={(e) => setAuthForm((current) => ({ ...current, name: e.target.value }))}
                className="field"
                placeholder="Alex Trader"
              />
            </label>
          )}

          <label className="block text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Email</span>
            <input
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm((current) => ({ ...current, email: e.target.value }))}
              className="field"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Password</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((current) => ({ ...current, password: e.target.value }))}
              className="field"
              placeholder="••••••••"
            />
          </label>

          <Button type="submit" variant="secondary" size="md" className="w-full">
            {authMode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-2 text-sm text-slate-300">
          <span>{authMode === 'login' ? 'Need an account?' : 'Already have an account?'}</span>
          <button
            type="button"
            onClick={() => setAuthMode((current) => (current === 'login' ? 'register' : 'login'))}
            className="font-medium text-cyan-300 underline decoration-cyan-400/60 underline-offset-4"
          >
            {authMode === 'login' ? 'Register' : 'Log in'}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="font-medium text-white">Demo account</p>
          <p className="mt-1">Email: demo@journal.local</p>
          <p>Password: demo123</p>
        </div>
      </div>
    </main>
  );

  const renderCalculator = () => (
    <section className="glass-panel rounded-3xl p-6 shadow-soft">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">Position Size Calculator</h2>
        <p className="mt-2 text-slate-300">Estimate how many shares to buy or sell based on your account size, risk tolerance, and stop distance.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Account Size">
            <input
              type="number"
              min="0"
              step="100"
              value={positionCalc.accountSize}
              onChange={(e) => setPositionCalc((current) => ({ ...current, accountSize: e.target.value }))}
              className="field"
              placeholder="10000"
            />
          </Field>

          <Field label="Funded Account Size">
            <input
              type="number"
              min="0"
              step="100"
              value={positionCalc.fundedAccountSize}
              onChange={(e) => setPositionCalc((current) => ({ ...current, fundedAccountSize: e.target.value }))}
              className="field"
              placeholder="100000"
            />
          </Field>

          <Field label="Risk %">
            <input
              type="number"
              min="0"
              step="0.1"
              value={positionCalc.riskPercent}
              onChange={(e) => setPositionCalc((current) => ({ ...current, riskPercent: e.target.value }))}
              className="field"
              placeholder="1.0"
            />
          </Field>

          <Field label="Max Daily Loss %">
            <input
              type="number"
              min="0"
              step="0.1"
              value={positionCalc.maxDailyLossPercent}
              onChange={(e) => setPositionCalc((current) => ({ ...current, maxDailyLossPercent: e.target.value }))}
              className="field"
              placeholder="5"
            />
          </Field>

          <Field label="Max Drawdown %">
            <input
              type="number"
              min="0"
              step="0.1"
              value={positionCalc.maxDrawdownPercent}
              onChange={(e) => setPositionCalc((current) => ({ ...current, maxDrawdownPercent: e.target.value }))}
              className="field"
              placeholder="10"
            />
          </Field>

          <Field label="Entry Price">
            <input
              type="number"
              min="0"
              step="0.01"
              value={positionCalc.entryPrice}
              onChange={(e) => setPositionCalc((current) => ({ ...current, entryPrice: e.target.value }))}
              className="field"
              placeholder="0.00"
            />
          </Field>

          <Field label="Stop-Loss">
            <input
              type="number"
              min="0"
              step="0.01"
              value={positionCalc.stopLoss}
              onChange={(e) => setPositionCalc((current) => ({ ...current, stopLoss: e.target.value }))}
              className="field"
              placeholder="0.00"
            />
          </Field>
        </div>

        <div className="rounded-3xl border border-violet-500/40 bg-violet-500/10 p-5">
          <h3 className="text-sm uppercase tracking-[0.2em] text-violet-300">Result</h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SummaryTile label="Base Risk" value={formatCurrency(positionSizeMetrics.baseRiskAmount)} />
            <SummaryTile label="Prop Firm Cap" value={positionSizeMetrics.propFirmCap > 0 ? formatCurrency(positionSizeMetrics.propFirmCap) : '—'} />
            <SummaryTile label="Risk Amount" value={formatCurrency(positionSizeMetrics.riskAmount)} />
            <SummaryTile label="Stop Distance" value={positionSizeMetrics.stopDistance > 0 ? formatCurrency(positionSizeMetrics.stopDistance) : '—'} />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Suggested Shares</p>
              <span className="text-2xl font-semibold text-white">
                {positionSizeMetrics.suggestedSize > 0 ? positionSizeMetrics.suggestedSize.toFixed(0) : '0'}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {positionSizeMetrics.fundedAccountSize > 0 && positionSizeMetrics.propFirmCap > 0
                ? 'Using the tighter prop-firm limit for the final risk budget.'
                : 'Using your personal risk budget for this trade.'}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Formula</p>
            <p className="mt-2 text-base font-medium text-white">
              Risk Amount = min(Account Size × Risk %, Funded Cap)
            </p>
            <p className="mt-1 text-slate-300">
              Funded Cap = min(Funded Size × Daily Loss %, Funded Size × Drawdown %)
            </p>
            <p className="mt-1 text-slate-300">
              Suggested Shares = Risk Amount ÷ Absolute(Entry Price − Stop-Loss)
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  if (!currentUser) {
    return renderAuthScreen();
  }

  return (
    <main className={`dashboard ${theme === 'light' ? 'theme-light' : 'theme-dark'} text-slate-100`}>
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <p className="dashboard-eyebrow">Trading journal</p>
            <h1>Stock Performance Dashboard</h1>
          </div>

          <div className="dashboard-header-actions">
            <nav aria-label="Primary navigation" className="dashboard-workspace-nav">
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="nav"
                  size="sm"
                  active={page === item.id}
                  aria-current={page === item.id ? 'page' : undefined}
                  onClick={() => setPage(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                {currentUser.name}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </Button>
              <Button type="button" variant="quiet" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>

            <div aria-label="File actions" className="dashboard-utility-cluster">
              <Button type="button" variant="quiet" size="sm" onClick={exportCsv}>
                Export CSV
              </Button>
              <FileButton
                variant="quiet"
                size="sm"
                inputProps={{ accept: '.csv', onChange: importCsv }}
              >
                Import CSV
              </FileButton>
            </div>
          </div>
        </header>

        {page === 'dashboard' && renderDashboard()}
        {page === 'analytics' && renderAnalytics()}
        {page === 'calculator' && renderCalculator()}
        {page === 'tradovate' && renderTradovate()}
      </div>
    </main>
  );
}

function ChartPanel({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-3xl p-6 shadow-soft">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">{footer}</p>
    </div>
  );
}

function EmotionWheelChart({ data, formatCurrency }: { data: Array<{ state: string; loss: number; wins: number; level: { tone: 'rose' | 'orange' | 'amber' | 'emerald'; label: string } }>; formatCurrency: (value: number) => string }) {
  if (!data.length) {
    return <p className="text-slate-300">No emotional-state data has been logged yet.</p>;
  }

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  const maxLoss = Math.max(...data.map((item) => item.loss), 1);
  const maxWins = Math.max(...data.map((item) => item.wins), 1);
  const centerX = 150;
  const centerY = 150;
  const wheelRadii = [45, 78, 108];

  const toneClasses: Record<string, string> = {
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    orange: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  };

  const wheelEntries = PLUTCHIK_EMOTIONS.map((emotion) => {
    const metric = data.find((item) => item.state === emotion.name);
    return {
      ...emotion,
      loss: metric?.loss ?? 0,
      wins: metric?.wins ?? 0,
      level: metric?.level ?? { label: 'No data', tone: 'emerald' },
    };
  });

  const render2DView = () => (
    <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/40 p-3">
      <svg viewBox="0 0 300 300" className="h-72 w-full" role="img" aria-label="Plutchik emotional wheel">
        {[...Array(3)].map((_, index) => (
          <circle
            key={`ring-${index}`}
            cx={centerX}
            cy={centerY}
            r={wheelRadii[index]}
            fill="none"
            stroke="rgba(148, 163, 184, 0.32)"
            strokeWidth={1}
            strokeDasharray="4 6"
          />
        ))}

        {wheelEntries.map((emotion) => {
          const oppositeEmotion = wheelEntries.find((entry) => entry.name === emotion.opposite);
          if (!oppositeEmotion) {
            return null;
          }

          const sourceX = centerX + Math.cos(emotion.angle) * 106;
          const sourceY = centerY + Math.sin(emotion.angle) * 106;
          const targetX = centerX + Math.cos(oppositeEmotion.angle) * 106;
          const targetY = centerY + Math.sin(oppositeEmotion.angle) * 106;

          return (
            <line
              key={`pair-${emotion.name}`}
              x1={sourceX}
              y1={sourceY}
              x2={targetX}
              y2={targetY}
              stroke="rgba(148, 163, 184, 0.28)"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          );
        })}

        <circle cx={centerX} cy={centerY} r={18} fill="rgba(15, 23, 42, 0.9)" stroke="rgba(148, 163, 184, 0.35)" strokeWidth={1.2} />
        <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="#f8fafc" fontSize="10" fontWeight={700} letterSpacing="0.08em">
          EMOTION
        </text>

        {wheelEntries.map((emotion) => {
          const radius = 48 + (emotion.loss / maxLoss) * 52;
          const x = centerX + Math.cos(emotion.angle) * radius;
          const y = centerY + Math.sin(emotion.angle) * radius;
          const labelX = centerX + Math.cos(emotion.angle) * 122;
          const labelY = centerY + Math.sin(emotion.angle) * 122;
          const textAnchor = labelX < centerX ? 'end' : labelX > centerX ? 'start' : 'middle';
          const radiusFactor = Math.max(0.08, emotion.loss / maxLoss || 0);

          return (
            <g key={emotion.name}>
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX + Math.cos(emotion.angle) * 106}
                y2={centerY + Math.sin(emotion.angle) * 106}
                stroke="rgba(148, 163, 184, 0.38)"
                strokeWidth={1}
              />
              <circle cx={x} cy={y} r={6 + radiusFactor * 8} fill={emotion.color} stroke="#f8fafc" strokeWidth={1.5} />
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill="#e2e8f0"
                fontSize="10"
                fontWeight={600}
                letterSpacing="0.08em"
              >
                {emotion.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <div className="rounded-full border border-slate-600 bg-slate-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
          Top loss • {formatCurrency(data[0].loss)}
        </div>
      </div>
    </div>
  );

  const render3DView = () => (
    <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/40 p-3">
      <svg viewBox="0 0 300 300" className="h-72 w-full" role="img" aria-label="Plutchik emotional cone model">
        <circle cx={centerX} cy={centerY} r={112} fill="none" stroke="rgba(148, 163, 184, 0.22)" strokeWidth={1} strokeDasharray="4 8" />

        {wheelEntries.map((emotion) => {
          const coneLength = 52 + (emotion.loss / maxLoss) * 46;
          const spread = 0.24;
          const baseRadius = 30 + (emotion.loss / maxLoss) * 12;
          const apexX = centerX + Math.cos(emotion.angle) * 18;
          const apexY = centerY + Math.sin(emotion.angle) * 18;
          const leftBaseX = centerX + Math.cos(emotion.angle - spread) * (coneLength + 12);
          const leftBaseY = centerY + Math.sin(emotion.angle - spread) * (coneLength + 12);
          const rightBaseX = centerX + Math.cos(emotion.angle + spread) * (coneLength + 12);
          const rightBaseY = centerY + Math.sin(emotion.angle + spread) * (coneLength + 12);
          const baseCenterX = centerX + Math.cos(emotion.angle) * (coneLength + 8);
          const baseCenterY = centerY + Math.sin(emotion.angle) * (coneLength + 8);
          const labelX = centerX + Math.cos(emotion.angle) * 122;
          const labelY = centerY + Math.sin(emotion.angle) * 122;
          const textAnchor = labelX < centerX ? 'end' : labelX > centerX ? 'start' : 'middle';

          return (
            <g key={`cone-${emotion.name}`}>
              <polygon
                points={`${apexX},${apexY} ${leftBaseX},${leftBaseY} ${rightBaseX},${rightBaseY}`}
                fill={emotion.color}
                opacity={0.9}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={0.8}
              />
              <ellipse
                cx={baseCenterX}
                cy={baseCenterY}
                rx={baseRadius}
                ry={baseRadius * 0.56}
                fill={emotion.color}
                opacity={0.78}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={0.8}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill="#f8fafc"
                fontSize="10"
                fontWeight={600}
                letterSpacing="0.08em"
              >
                {emotion.name}
              </text>
            </g>
          );
        })}

        <circle cx={centerX} cy={centerY} r={18} fill="rgba(15, 23, 42, 0.9)" stroke="rgba(148, 163, 184, 0.35)" strokeWidth={1.2} />
        <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="#f8fafc" fontSize="10" fontWeight={700} letterSpacing="0.08em">
          EMOTION
        </text>
      </svg>

      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <div className="rounded-full border border-slate-600 bg-slate-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
          3D cone model • {formatCurrency(data[0].loss)} peak
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
      <div className="space-y-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${viewMode === '2d' ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200' : 'border-slate-600 bg-slate-900/60 text-slate-300'}`}
          >
            2D Circular
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${viewMode === '3d' ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200' : 'border-slate-600 bg-slate-900/60 text-slate-300'}`}
          >
            3D Cone
          </button>
        </div>

        {viewMode === '2d' ? render2DView() : render3DView()}
      </div>

      <div className="grid gap-3">
        {wheelEntries
          .slice(0, 4)
          .map((item) => (
            <div key={item.name} className={`rounded-2xl border p-3 ${toneClasses[item.level.tone] ?? toneClasses.amber}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium text-white">{item.name}</span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                  {item.level.label}
                </span>
              </div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-200">Wins</span>
                <span className="font-semibold text-emerald-300">{item.wins}</span>
              </div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-200">Loss</span>
                <span className="font-medium text-rose-300">{formatCurrency(item.loss)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800/80">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-teal-300"
                  style={{ width: `${Math.min((item.wins / maxWins) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function LegendList({ data }: { data: Array<{ name: string; value: number; totalPnl?: number }> }) {
  if (!data.length) {
    return <p className="mt-4 text-slate-300">No data available yet.</p>;
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {data.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
            <div>
              <p className="text-sm text-slate-200">{item.name}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {item.totalPnl !== undefined ? `${item.value} • ${formatCurrency(item.totalPnl)}` : item.value}
              </p>
            </div>
          </div>
          <span className="text-sm text-slate-400">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function InsightCard({ title, value, description, tone }: { title: string; value: string; description: string; tone: 'positive' | 'negative' | 'info' }) {
  return (
    <div className={`dashboard-insight dashboard-insight--${tone}`}>
      <p className="dashboard-section-label">{title}</p>
      <p className="dashboard-insight__value">{value}</p>
      <p className="dashboard-insight__copy">{description}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 shadow-inner shadow-slate-950/20">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' | 'info' }) {
  return (
    <div className={`dashboard-metric dashboard-metric--${tone}`}>
      <p className="dashboard-section-label">{label}</p>
      <p className="dashboard-metric__value">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default App;
