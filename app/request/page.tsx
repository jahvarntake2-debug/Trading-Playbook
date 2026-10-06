'use client';

import { FormEvent, useState } from 'react';
import { SiteNav } from '@/components/SiteNav';

const starterItems = [
  { name: 'HB pencils', requested: 300, received: 180 },
  { name: 'A4 binders', requested: 80, received: 31 },
  { name: 'Scientific calculators', requested: 25, received: 9 },
];

export default function RequestPage() {
  const [items, setItems] = useState(starterItems);
  const [submitted, setSubmitted] = useState(false);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('item') || '').trim();
    const requested = Number(form.get('quantity'));
    if (!name || requested < 1) return;
    setItems([...items, { name, requested, received: 0 }]);
    event.currentTarget.reset();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-muted">
      <SiteNav />
      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="mb-12 max-w-3xl"><p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Request supplies</p><h1 className="text-5xl leading-tight sm:text-7xl">Build the list your classrooms actually need.</h1><p className="mt-5 text-xl text-ink/70">Teachers and school coordinators can create an inventory, see pledges arrive, and keep every request specific.</p></div>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={addItem} className="rounded-lg bg-white p-6 sm:p-8"><p className="text-sm font-semibold uppercase tracking-wider text-secondary">Teacher workspace</p><h2 className="mt-2 text-3xl">Add to your wishlist</h2><label className="mt-8 block text-sm font-semibold" htmlFor="item">Supply item</label><input id="item" name="item" placeholder="e.g. coloured pencils" className="mt-2 w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 focus:border-primary focus:bg-white" required /><label className="mt-5 block text-sm font-semibold" htmlFor="quantity">Quantity needed</label><input id="quantity" name="quantity" type="number" min="1" placeholder="100" className="mt-2 w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 focus:border-primary focus:bg-white" required /><button type="submit" className="mt-7 min-h-14 w-full rounded-md bg-secondary px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600">Add item to inventory</button>{submitted ? <p className="mt-4 rounded-md bg-[#d1fae5] px-3 py-2 text-sm text-ink">Item added. Your inventory is ready for donors.</p> : null}</form>
          <div className="rounded-lg bg-white p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Henderson North School</p><h2 className="mt-2 text-3xl">Term 4 inventory</h2></div><span className="rounded-md bg-accent px-3 py-2 text-sm font-semibold">{items.length} items</span></div><div className="mt-8 space-y-5">{items.map((item) => { const percent = Math.min(100, Math.round((item.received / item.requested) * 100)); return <div key={`${item.name}-${item.requested}`}><div className="mb-2 flex justify-between gap-4 text-sm font-medium"><span>{item.name}</span><span>{item.received}/{item.requested}</span></div><div className="h-3 rounded-md bg-muted"><div className="h-full rounded-md bg-primary" style={{ width: `${percent}%` }} /></div></div>; })}</div><p className="mt-8 text-sm text-ink/60">Only verified school staff can publish or edit this inventory. Donor contact information remains private.</p></div>
        </div>
      </section>
    </main>
  );
}
