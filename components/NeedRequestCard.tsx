export type Need = {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: string;
  image?: string;
  quantityNeeded: number;
  quantityFulfilled: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  school: {
    name: string;
    suburb: string;
    city: string;
  };
};

const urgencyStyles: Record<Need['urgency'], string> = {
  LOW: 'bg-muted text-ink',
  MEDIUM: 'bg-accent text-ink',
  HIGH: 'bg-primary text-white',
  CRITICAL: 'bg-ink text-white',
};

export function NeedRequestCard({ need, onPledge }: { need: Need; onPledge: () => void }) {
  const percentFulfilled = Math.min(100, Math.round((need.quantityFulfilled / need.quantityNeeded) * 100));

  return (
    <article className="block-in group rounded-lg bg-muted p-6 transition-all duration-200 hover:scale-[1.02] hover:bg-blue-50">
      {need.image ? <img src={need.image} alt={`${need.itemType} supplies`} className="mb-6 h-40 w-full rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]" /> : null}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">{need.category}</p>
          <h3 className="text-3xl leading-none text-ink">{need.title}</h3>
        </div>
        <span className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider ${urgencyStyles[need.urgency]}`}>
          {need.urgency}
        </span>
      </div>

      <p className="mb-4 text-base leading-6 text-ink/70">{need.description}</p>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-ink/60">
        <span>
          {need.school.name}
        </span>
        <span>
          {need.school.suburb}, {need.school.city}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm font-medium text-ink/70">
        <span>{need.itemType}</span>
        <span>
          {need.quantityFulfilled}/{need.quantityNeeded} fulfilled
        </span>
      </div>

      <div className="mb-5 h-3 overflow-hidden rounded-md bg-white">
        <div
          className="h-full bg-secondary transition-all duration-300"
          style={{ width: `${percentFulfilled}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{percentFulfilled}% supplied</span>
        <button onClick={onPledge} className="min-h-12 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-blue-600">
          Pledge items
        </button>
      </div>
    </article>
  );
}
