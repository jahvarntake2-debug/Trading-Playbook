import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Expand,
  Flame,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from './Button';

type Direction = 'Long' | 'Short';
type OverviewRange = '7D' | '30D' | '90D' | 'YTD';
type ExpandedPanel = 'trade-count' | 'radar' | 'balance' | null;
type ReturnUnit = 'percent' | 'currency';
type PerformancePeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Annualized';
type CalendarCellTone = 'profit' | 'loss' | 'neutral' | 'empty';

type Trade = {
  id: string;
  timestamp: string;
  ticker: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  netPnl: number;
  strategyTags: string;
  emotionalState: string;
  notes: string;
  reflections: string;
  mistakes: string[];
};

type Metrics = {
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  wins: number;
  losses: number;
  totalTrades: number;
  avgTradeSize: number;
};

type TradeCountPoint = { label: string; count: number };
type BalancePoint = { label: string; balance: number };
type RadarMetric = { metric: string; score: number };
type CalendarDay = {
  date: string;
  day: number;
  pnl: number;
  percent: number;
  tradeCount: number;
  tone: CalendarCellTone;
  isCurrentMonth: boolean;
};
type CalendarWeek = { days: CalendarDay[]; total: number };
type CalendarSummary = { trades: number; wins: number; profits: number; percent: number };

type TradingOverviewProps = {
  trades: Trade[];
  metrics: Metrics;
  formatCurrency: (value: number) => string;
  onExportCsv: () => void;
  onClearFilters: () => void;
  onOpenJournal: () => void;
};

const RANGE_OPTIONS: OverviewRange[] = ['7D', '30D', '90D', 'YTD'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STARTING_BALANCE = 25_073.81;
const PREVIEW_TRADE_PNL = [186, -176.16, 316.72, 72.76, 136.35, -76.52, 209.42, -76.15, 53.61, 90.33, 32.59, -250.36, 143.52, 31.97, -93.09, -127.26, 107.48, 116.75, 238.57, 44.94];

function formatPercent(value: number, digits = 2) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function formatSignedCurrency(value: number, formatCurrency: (value: number) => string) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatMonthLabel(month: Date) {
  return month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getRangeStart(range: OverviewRange, now = new Date()) {
  const start = new Date(now);

  if (range === 'YTD') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = range === '7D' ? 6 : range === '30D' ? 29 : 89;
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getTradesForRange(trades: Trade[], range: OverviewRange, now = new Date()) {
  const start = getRangeStart(range, now).getTime();
  const end = now.getTime();
  return trades.filter((trade) => {
    const time = new Date(trade.timestamp).getTime();
    return time >= start && time <= end;
  });
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTradeDateKey(timestamp: string) {
  return getDateKey(new Date(timestamp));
}

function buildCalendarWeeks(month: Date, trades: Trade[]): CalendarWeek[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const firstCell = new Date(year, monthIndex, 1 - firstDay.getDay());
  const tradesByDay = trades.reduce<Record<string, Trade[]>>((acc, trade) => {
    const key = getTradeDateKey(trade.timestamp);
    acc[key] = [...(acc[key] ?? []), trade];
    return acc;
  }, {});

  return Array.from({ length: 5 }, (_, weekIndex) => {
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(firstCell);
      date.setDate(firstCell.getDate() + weekIndex * 7 + dayIndex);
      const dayTrades = tradesByDay[getDateKey(date)] ?? [];
      const pnl = dayTrades.reduce((sum, trade) => sum + trade.netPnl, 0);
      const percent = dayTrades.length > 0 ? (pnl / STARTING_BALANCE) * 100 : 0;
      const tone: CalendarCellTone = dayTrades.length === 0 ? 'empty' : pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'neutral';

      return {
        date: getDateKey(date),
        day: date.getDate(),
        pnl,
        percent,
        tradeCount: dayTrades.length,
        tone,
        isCurrentMonth: date.getMonth() === monthIndex,
      };
    });

    return {
      days,
      total: days.reduce((sum, day) => sum + day.pnl, 0),
    };
  });
}

function buildPreviewCalendarWeeks(month: Date): CalendarWeek[] {
  const weeks = buildCalendarWeeks(month, []);
  let cursor = 0;

  return weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => {
      if (!day.isCurrentMonth || cursor >= PREVIEW_TRADE_PNL.length) {
        return day;
      }

      const previewPnl = PREVIEW_TRADE_PNL[cursor];
      cursor += 1;
      return {
        ...day,
        pnl: previewPnl,
        percent: (previewPnl / STARTING_BALANCE) * 100,
        tradeCount: Math.abs(previewPnl) > 200 ? 2 : 1,
        tone: (previewPnl > 0 ? 'profit' : 'loss') as CalendarCellTone,
      };
    }),
  })).map((week) => ({
    ...week,
    total: week.days.reduce((sum, day) => sum + day.pnl, 0),
  }));
}

function ChartHeader({ title, range, onRangeChange, onExpand, onMore }: {
  title: string;
  range?: OverviewRange;
  onRangeChange?: (range: OverviewRange) => void;
  onExpand?: () => void;
  onMore?: () => void;
}) {
  return (
    <div className="dj-card-header">
      <h3>{title}</h3>
      <div className="dj-card-actions">
        {range && onRangeChange ? (
          <div className="dj-range-control" aria-label={`${title} range`}>
            <span>Range:</span>
            {RANGE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                className={option === range ? 'is-active' : ''}
                onClick={() => onRangeChange(option)}
                aria-pressed={option === range}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        {onExpand ? (
          <button type="button" className="dj-icon-button" onClick={onExpand} aria-label={`Expand ${title}`} title={`Expand ${title}`}>
            <Expand size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
        {onMore ? (
          <button type="button" className="dj-icon-button" onClick={onMore} aria-label={`${title} options`} title={`${title} options`}>
            <EllipsisVertical size={17} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TradeCountCard({ data, range, onRangeChange, onExpand }: { data: TradeCountPoint[]; range: OverviewRange; onRangeChange: (range: OverviewRange) => void; onExpand: () => void }) {
  return (
    <article className="dj-card dj-trade-count-card">
      <ChartHeader title="Trade Count" range={range} onRangeChange={onRangeChange} onExpand={onExpand} />
      <div className="dj-kpi-number">{data.reduce((sum, point) => sum + point.count, 0)}</div>
      <div className="dj-mini-chart" role="img" aria-label="Trade count trend">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <Line type="monotone" dataKey="count" stroke="var(--dj-blue)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--dj-blue)', stroke: 'var(--dj-text)', strokeWidth: 1 }} isAnimationActive animationDuration={650} />
            <Tooltip
              cursor={{ stroke: 'var(--dj-blue-soft)' }}
              contentStyle={{ background: 'var(--dj-surface-raised)', border: '1px solid var(--dj-border-strong)', borderRadius: 8, color: 'var(--dj-text)', fontSize: 11 }}
              labelStyle={{ color: 'var(--dj-muted)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function WinRateCard({ winRate }: { winRate: number }) {
  return (
    <article className="dj-card dj-gauge-card">
      <div className="dj-kpi-number">{winRate.toFixed(2)}%</div>
      <p className="dj-card-label">Winrate</p>
      <div className="dj-gauge-chart" role="img" aria-label={`Win rate ${winRate.toFixed(2)} percent`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ value: Math.max(0, Math.min(winRate, 100)) }]}
            cx="50%"
            cy="100%"
            innerRadius="62%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            barSize={14}
          >
            <RadialBar dataKey="value" background={{ fill: 'var(--dj-grid)' }} fill="var(--dj-blue)" cornerRadius={12} isAnimationActive animationDuration={700} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function AverageWinLossCard({ avgWin, avgLoss }: { avgWin: number; avgLoss: number }) {
  const total = avgWin + avgLoss || 1;
  const winWidth = (avgWin / total) * 100;

  return (
    <article className="dj-card dj-avg-card">
      <div className="dj-kpi-number">{(avgWin / (avgLoss || 1)).toFixed(2)}</div>
      <p className="dj-card-label">Avg Win / Avg Loss</p>
      <div className="dj-segment-bar" role="img" aria-label={`Average win ${avgWin.toFixed(2)} and average loss ${avgLoss.toFixed(2)}`}>
        <span className="dj-segment-bar-win" style={{ width: `${winWidth}%` }} />
        <span className="dj-segment-bar-loss" style={{ width: `${100 - winWidth}%` }} />
      </div>
      <div className="dj-segment-legend"><span>{formatCompactNumber(avgWin)}</span><span>{formatCompactNumber(avgLoss)}</span></div>
    </article>
  );
}

function formatCompactNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

function StreakCard({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let current = 0;
    let best = 0;
    sorted.forEach((trade) => {
      if (trade.netPnl > 0) {
        current += 1;
        best = Math.max(best, current);
      } else if (trade.netPnl < 0) {
        current = 0;
      }
    });
    return { current, best };
  }, [trades]);

  return (
    <article className="dj-card dj-streak-card">
      <div className="dj-card-title-row"><h3>Winstreak</h3><Flame size={17} color="var(--dj-blue)" aria-hidden="true" /></div>
      <div className="dj-streak-grid">
        <div><strong>{stats.best || 1}</strong><Flame size={28} color="var(--dj-blue)" strokeWidth={1.8} aria-hidden="true" /><span>Days</span></div>
        <div><strong>{stats.current || stats.best || 1}</strong><Flame size={28} color="var(--dj-blue)" strokeWidth={1.8} aria-hidden="true" /><span>Trades</span></div>
      </div>
      <div className="dj-streak-badges"><span>W {trades.filter((trade) => trade.netPnl > 0).length}</span><span>L {trades.filter((trade) => trade.netPnl < 0).length}</span></div>
    </article>
  );
}

function RadarCard({ data, onExpand }: { data: RadarMetric[]; onExpand: () => void }) {
  return (
    <article className="dj-card dj-radar-card">
      <ChartHeader title="WaveScore Radar" onExpand={onExpand} />
      <div className="dj-radar-subtitle"><span className="dj-pro-badge">Pro</span><span>Entry</span></div>
      <div className="dj-radar-chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="65%">
            <PolarGrid stroke="var(--dj-grid)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--dj-muted)', fontSize: 10, fontWeight: 600 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="var(--dj-radar)" fill="var(--dj-radar)" fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: 'var(--dj-radar)', stroke: 'var(--dj-text)', strokeWidth: 1 }} isAnimationActive animationDuration={800} />
            <Tooltip
              contentStyle={{ background: 'var(--dj-surface-raised)', border: '1px solid var(--dj-border-strong)', borderRadius: 8, color: 'var(--dj-text)', fontSize: 11 }}
              formatter={(value) => [`${Number(value ?? 0).toFixed(0)} / 100`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="dj-radar-score">{Math.round(data.reduce((sum, item) => sum + item.score, 0) / (data.length || 1))}</div>
      </div>
    </article>
  );
}

function BalanceCard({ data, balance, onExpand, range, onRangeChange }: { data: BalancePoint[]; balance: number; onExpand: () => void; range: OverviewRange; onRangeChange: (range: OverviewRange) => void }) {
  return (
    <article className="dj-card dj-balance-card">
      <ChartHeader title="Balance" range={range} onRangeChange={onRangeChange} onExpand={onExpand} />
      <div className="dj-balance-number">{formatDollar(balance)}</div>
      <div className="dj-balance-chart" role="img" aria-label="Account balance trend">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="djBalanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--dj-blue)" stopOpacity={0.38} />
                <stop offset="100%" stopColor="var(--dj-blue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--dj-grid)" vertical={false} />
            <Area type="monotone" dataKey="balance" stroke="var(--dj-blue)" strokeWidth={2.5} fill="url(#djBalanceFill)" dot={false} activeDot={{ r: 4, fill: 'var(--dj-blue)', stroke: 'var(--dj-text)', strokeWidth: 1 }} isAnimationActive animationDuration={700} />
            <Tooltip
              contentStyle={{ background: 'var(--dj-surface-raised)', border: '1px solid var(--dj-border-strong)', borderRadius: 8, color: 'var(--dj-text)', fontSize: 11 }}
              formatter={(value) => [formatDollar(Number(value ?? 0)), 'Balance']}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function formatDollar(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PerformancePanel({ metrics, trades, formatCurrency }: { metrics: Metrics; trades: Trade[]; formatCurrency: (value: number) => string }) {
  const [unit, setUnit] = useState<ReturnUnit>('percent');
  const [period, setPeriod] = useState<PerformancePeriod>('Monthly');
  const totalPnl = trades.reduce((sum, trade) => sum + trade.netPnl, 0);
  const annualized = totalPnl / STARTING_BALANCE * 12;
  const periodValues: Record<PerformancePeriod, number> = {
    Daily: totalPnl / STARTING_BALANCE / 30,
    Weekly: totalPnl / STARTING_BALANCE / 4,
    Monthly: totalPnl / STARTING_BALANCE,
    Annualized: annualized,
  };
  const selectedValue = periodValues[period];

  return (
    <article className="dj-card dj-performance-card">
      <div className="dj-section-kicker">Performance</div>
      <div className="dj-performance-head">
        <div><span>Gain %</span><strong>{formatPercent((totalPnl / STARTING_BALANCE) * 100)}</strong><small>0.00% Abs</small></div>
        <div><span>NET P&amp;L</span><strong>{formatSignedCurrency(totalPnl, formatCurrency)}</strong></div>
      </div>
      <div className="dj-section-divider" />
      <div className="dj-performance-section-head"><span><span className="dj-sparkline-mark">⌁</span> Period Returns</span><div className="dj-unit-toggle"><button type="button" className={unit === 'percent' ? 'is-active' : ''} onClick={() => setUnit('percent')} aria-pressed={unit === 'percent'}>%</button><button type="button" className={unit === 'currency' ? 'is-active' : ''} onClick={() => setUnit('currency')} aria-pressed={unit === 'currency'}>$</button></div></div>
      <div className="dj-period-tabs" role="tablist" aria-label="Performance period">
        {(Object.keys(periodValues) as PerformancePeriod[]).map((option) => (
          <button type="button" role="tab" key={option} className={period === option ? 'is-active' : ''} aria-selected={period === option} onClick={() => setPeriod(option)}>
            <span>{option}</span><strong>{unit === 'percent' ? formatPercent(periodValues[option] * 100) : formatCurrency(totalPnl * (periodValues[option] / (periodValues.Monthly || 1)))}</strong>
          </button>
        ))}
      </div>
      <p className="dj-selected-return">{period}: <strong>{unit === 'percent' ? formatPercent(selectedValue * 100) : formatSignedCurrency(totalPnl * (selectedValue / (periodValues.Monthly || 1)), formatCurrency)}</strong></p>
      <div className="dj-section-divider" />
      <div className="dj-performance-section-head"><span><ShieldCheck size={15} aria-hidden="true" /> Risk</span></div>
      <div className="dj-risk-list">
        <div><span>Max Balance Drawdown</span><strong className="is-negative">1.12%</strong></div>
        <div><span>Current Equity</span><strong>$0.00</strong></div>
        <div><span>Current Balance</span><strong>{formatDollar(STARTING_BALANCE + totalPnl)}</strong></div>
        <div><span>Highest Balance</span><strong>{formatDollar(STARTING_BALANCE + Math.max(totalPnl, 1_166.64))}</strong></div>
      </div>
      <div className="dj-capital-flow"><span>▣ Capital Flows</span><strong>{metrics.totalTrades} active records</strong></div>
    </article>
  );
}

function TradingCalendar({ month, onMonthChange, weeks, summary, trades, onSelectDay, onMore }: { month: Date; onMonthChange: (offset: number) => void; weeks: CalendarWeek[]; summary: CalendarSummary; trades: Trade[]; onSelectDay: (day: CalendarDay) => void; onMore: () => void }) {
  return (
    <article className="dj-card dj-calendar-card">
      <div className="dj-calendar-header">
        <div className="dj-calendar-title">
          <button type="button" className="dj-icon-button" onClick={() => onMonthChange(-1)} aria-label="Previous month" title="Previous month"><ChevronLeft size={18} aria-hidden="true" /></button>
          <h3>{formatMonthLabel(month)}</h3>
          <button type="button" className="dj-icon-button" onClick={() => onMonthChange(1)} aria-label="Next month" title="Next month"><ChevronRight size={18} aria-hidden="true" /></button>
          <CalendarDays size={16} color="var(--dj-blue)" aria-hidden="true" />
        </div>
        <div className="dj-calendar-actions">
          <div className="dj-calendar-summary"><span>Trades <strong>{summary.trades}</strong></span><span>Wins <strong>{summary.wins}</strong></span><span>Profits <strong>{formatDollar(summary.profits)}</strong></span><span>Percent <strong>{formatPercent(summary.percent)}</strong></span></div>
          <button type="button" className="dj-icon-button" onClick={onMore} aria-label="Calendar options" title="Calendar options"><EllipsisVertical size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="dj-calendar-scroll">
        <div className="dj-calendar-grid" role="region" aria-label={`${formatMonthLabel(month)} trading calendar`}>
          {WEEKDAYS.map((weekday) => <div className="dj-calendar-weekday" key={weekday}>{weekday}</div>)}
          <div className="dj-calendar-weekday dj-total-heading">Total</div>
          {weeks.flatMap((week, weekIndex) => [
            ...week.days.map((day) => <CalendarCell key={`${weekIndex}-${day.date}`} day={day} onSelect={onSelectDay} />),
            <div className={`dj-calendar-total ${week.total >= 0 ? 'is-profit' : 'is-loss'}`} key={`total-${weekIndex}`}><strong>{week.total >= 0 ? `+${formatDollar(week.total)}` : `-${formatDollar(Math.abs(week.total))}`}</strong><span>{formatPercent((week.total / STARTING_BALANCE) * 100)}</span></div>,
          ])}
        </div>
      </div>
      <div className="dj-calendar-footer"><span>{trades.length ? 'Synced from your trade journal' : 'Preview data · log a trade to replace it'}</span><span className="dj-calendar-legend"><i className="is-profit" /> Profit <i className="is-loss" /> Loss</span></div>
    </article>
  );
}

function CalendarCell({ day, onSelect }: { day: CalendarDay; onSelect: (day: CalendarDay) => void }) {
  return (
    <button type="button" className={`dj-calendar-cell is-${day.tone} ${day.isCurrentMonth ? '' : 'is-outside'}`} onClick={() => onSelect(day)} aria-label={`${day.date}, ${day.tradeCount ? `${day.tradeCount} trades, ${formatDollar(day.pnl)}` : 'no trades'}`}>
      <span className="dj-calendar-date">{day.day}</span>
      {day.tradeCount > 0 ? <><strong>{formatDollar(day.pnl)}</strong><span>{formatPercent(day.percent)}</span></> : null}
    </button>
  );
}

function ExpandedChartDialog({ panel, onClose, children }: { panel: Exclude<ExpandedPanel, null>; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="dj-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="dj-dialog" role="dialog" aria-modal="true" aria-label={`${panel} expanded chart`} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="dj-dialog-close dj-icon-button" onClick={onClose} aria-label="Close chart" title="Close chart"><X size={18} aria-hidden="true" /></button>
        {children}
      </div>
    </div>
  );
}

export function TradingOverview({ trades, metrics, formatCurrency, onExportCsv, onClearFilters, onOpenJournal }: TradingOverviewProps) {
  const [tradeCountRange, setTradeCountRange] = useState<OverviewRange>('30D');
  const [balanceRange, setBalanceRange] = useState<OverviewRange>('30D');
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2026, 0, 1));
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<CalendarDay | null>(null);
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);

  const tradeCountTrades = useMemo(() => getTradesForRange(trades, tradeCountRange), [trades, tradeCountRange]);
  const balanceTrades = useMemo(() => getTradesForRange(trades, balanceRange), [trades, balanceRange]);
  const tradeCountSeries = useMemo<TradeCountPoint[]>(() => {
    const source = tradeCountTrades.length > 0 ? tradeCountTrades : trades;
    const grouped = source.reduce<Record<string, number>>((acc, trade) => {
      const date = new Date(trade.timestamp);
      const label = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
    const values = Object.entries(grouped).map(([label, count]) => ({ label, count }));
    return values.length > 0 ? values : [{ label: '1', count: 0 }, { label: '2', count: 0 }, { label: '3', count: 0 }];
  }, [tradeCountTrades, trades]);
  const balanceSeries = useMemo<BalancePoint[]>(() => {
    const source = balanceTrades.length > 0 ? balanceTrades : trades;
    let balance = STARTING_BALANCE;
    const values = [...source].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((trade) => {
      balance += trade.netPnl;
      return { label: new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), balance: Number(balance.toFixed(2)) };
    });
    return values.length > 0 ? values : [{ label: '1', balance: STARTING_BALANCE }, { label: '2', balance: STARTING_BALANCE + 380 }, { label: '3', balance: STARTING_BALANCE + 120 }];
  }, [balanceTrades, trades]);
  const radarData = useMemo<RadarMetric[]>(() => {
    const wins = Math.max(metrics.winRate, 1);
    return [
      { metric: 'Entry', score: Math.min(98, Math.round(wins + 24)) },
      { metric: 'Risk', score: Math.min(98, Math.round(metrics.profitFactor * 43)) },
      { metric: 'Exit', score: Math.min(96, Math.round((metrics.avgWin / (metrics.avgLoss || 1)) * 58)) },
      { metric: 'Stability', score: Math.min(94, Math.max(38, Math.round(metrics.winRate + 8))) },
      { metric: 'Tempo', score: Math.min(96, Math.max(32, Math.round(100 - metrics.totalTrades * 2))) },
    ];
  }, [metrics]);
  const calendarWeeks = useMemo(() => {
    const actual = buildCalendarWeeks(calendarMonth, trades);
    return trades.length > 0 && actual.some((week) => week.days.some((day) => day.tradeCount > 0 && day.isCurrentMonth)) ? actual : buildPreviewCalendarWeeks(calendarMonth);
  }, [calendarMonth, trades]);
  const calendarSummary = useMemo<CalendarSummary>(() => {
    const currentMonthDays = calendarWeeks.flatMap((week) => week.days).filter((day) => day.isCurrentMonth && day.tradeCount > 0);
    const profits = currentMonthDays.reduce((sum, day) => sum + day.pnl, 0);
    return {
      trades: currentMonthDays.reduce((sum, day) => sum + day.tradeCount, 0),
      wins: currentMonthDays.filter((day) => day.pnl > 0).reduce((sum, day) => sum + day.tradeCount, 0),
      profits,
      percent: (profits / STARTING_BALANCE) * 100,
    };
  }, [calendarWeeks]);

  const expandedContent = expandedPanel === 'trade-count' ? <TradeCountCard data={tradeCountSeries} range={tradeCountRange} onRangeChange={setTradeCountRange} onExpand={() => setExpandedPanel(null)} /> : expandedPanel === 'radar' ? <RadarCard data={radarData} onExpand={() => setExpandedPanel(null)} /> : expandedPanel === 'balance' ? <BalanceCard data={balanceSeries} balance={STARTING_BALANCE + trades.reduce((sum, trade) => sum + trade.netPnl, 0)} range={balanceRange} onRangeChange={setBalanceRange} onExpand={() => setExpandedPanel(null)} /> : null;

  return (
    <section className="journal-reference" aria-label="Trading journal overview">
      <h2 className="sr-only">Performance overview</h2>
      <div className="dj-overview-grid">
        <div className="dj-left-stack">
          <TradeCountCard data={tradeCountSeries} range={tradeCountRange} onRangeChange={setTradeCountRange} onExpand={() => setExpandedPanel('trade-count')} />
          <div className="dj-two-up"><WinRateCard winRate={metrics.winRate} /><AverageWinLossCard avgWin={metrics.avgWin} avgLoss={metrics.avgLoss} /></div>
          <StreakCard trades={trades} />
        </div>
        <RadarCard data={radarData} onExpand={() => setExpandedPanel('radar')} />
        <BalanceCard data={balanceSeries} balance={STARTING_BALANCE + trades.reduce((sum, trade) => sum + trade.netPnl, 0)} range={balanceRange} onRangeChange={setBalanceRange} onExpand={() => setExpandedPanel('balance')} />
        <PerformancePanel metrics={metrics} trades={trades} formatCurrency={formatCurrency} />
        <TradingCalendar month={calendarMonth} onMonthChange={(offset) => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))} weeks={calendarWeeks} summary={calendarSummary} trades={trades} onSelectDay={setSelectedCalendarDay} onMore={() => setCalendarMenuOpen((current) => !current)} />
      </div>
      <div className="dj-workspace-bridge"><div><span className="dj-section-kicker">Journal Workspace</span><p>Capture the why behind every setup, then review the pattern in your analytics.</p></div><Button type="button" variant="primary" size="sm" onClick={onOpenJournal}>Log trade</Button></div>
      {calendarMenuOpen ? <div className="dj-calendar-menu" role="menu"><button type="button" onClick={() => { onExportCsv(); setCalendarMenuOpen(false); }}>Export journal CSV</button><button type="button" onClick={() => { onClearFilters(); setCalendarMenuOpen(false); }}>Clear filters</button></div> : null}
      {expandedPanel && expandedContent ? <ExpandedChartDialog panel={expandedPanel} onClose={() => setExpandedPanel(null)}>{expandedContent}</ExpandedChartDialog> : null}
      {selectedCalendarDay ? <div className="dj-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedCalendarDay(null)}><div className="dj-day-dialog" role="dialog" aria-modal="true" aria-label={`Details for ${selectedCalendarDay.date}`} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="dj-dialog-close dj-icon-button" onClick={() => setSelectedCalendarDay(null)} aria-label="Close day details"><X size={18} aria-hidden="true" /></button><span className="dj-section-kicker">Trading day</span><h3>{selectedCalendarDay.date}</h3>{selectedCalendarDay.tradeCount > 0 ? <><strong className={selectedCalendarDay.pnl >= 0 ? 'is-positive' : 'is-negative'}>{formatSignedCurrency(selectedCalendarDay.pnl, formatCurrency)}</strong><p>{selectedCalendarDay.tradeCount} trade{selectedCalendarDay.tradeCount === 1 ? '' : 's'} recorded · {formatPercent(selectedCalendarDay.percent)}</p></> : <p>No trades for this day.</p>}</div></div> : null}
    </section>
  );
}
