'use client';

import { useState } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { NeedRequestCard } from '@/components/NeedRequestCard';
import { demoNeeds } from '@/lib/demo-data';
import type { Need } from '@/components/NeedRequestCard';

export default function DonatePage() {
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);
  const [pledgeQuantity, setPledgeQuantity] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <main className="min-h-screen bg-canvas">
      <SiteNav />
      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Donate supplies</p>
          <h1 className="text-5xl leading-tight sm:text-7xl">Turn spare supplies into a student&apos;s starting line.</h1>
          <p className="mt-5 text-xl text-ink/70">Browse a school wishlist, pledge the items you can provide, or arrange a bulk donation from your workplace.</p>
        </div>
        <div className="mb-14 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-primary p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Option 01</p>
            <h2 className="mt-3 text-3xl font-bold">Browse wishlists</h2>
            <p className="mt-3 text-white/80">Choose one exact item, select a quantity, and book a collection time.</p>
          </div>
          <div className="rounded-lg bg-secondary p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Option 02</p>
            <h2 className="mt-3 text-3xl font-bold">Bulk donate</h2>
            <p className="mt-3 text-white/80">Have a workplace cupboard or end-of-term stock? Tell us what you have and our team will sort it.</p>
          </div>
        </div>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Live inventory</p><h2 className="mt-2 text-4xl">School wishlists</h2></div>
          <span className="hidden rounded-md bg-accent px-3 py-2 text-sm font-semibold sm:inline-block">Auckland first</span>
        </div>
        <div className="card-grid grid gap-6">
          {demoNeeds.map((need) => <NeedRequestCard key={need.id} need={need} onPledge={() => { setSelectedNeed(need); setConfirmed(false); setPledgeQuantity(1); }} />)}
        </div>
      </section>
      {selectedNeed ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            {confirmed ? (
              <><p className="text-sm font-semibold uppercase tracking-wider text-secondary">Pledge confirmed</p><h2 className="mt-2 text-3xl">You&apos;re helping {selectedNeed.school.name}.</h2><p className="mt-3 text-ink/70">Our team will contact you to arrange collection. You&apos;ll receive a delivery photo when the school receives your items.</p><button onClick={() => setSelectedNeed(null)} className="mt-6 min-h-14 w-full rounded-md bg-primary px-4 py-3 font-semibold text-white hover:bg-blue-600">Done</button></>
            ) : (
              <><div className="flex items-start justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Pledge supplies</p><h2 className="mt-2 text-3xl">{selectedNeed.itemType}</h2><p className="mt-1 text-ink/60">{selectedNeed.school.name}</p></div><button onClick={() => setSelectedNeed(null)} aria-label="Close dialog" className="text-2xl text-ink/50">&times;</button></div><label className="mt-6 block text-sm font-semibold">Quantity</label><input type="number" min={1} max={selectedNeed.quantityNeeded - selectedNeed.quantityFulfilled} value={pledgeQuantity} onChange={(event) => setPledgeQuantity(Number(event.target.value))} className="mt-2 w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 focus:border-primary focus:bg-white" /><button onClick={() => setConfirmed(true)} className="mt-6 min-h-14 w-full rounded-md bg-primary px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:bg-blue-600">Confirm pledge</button><p className="mt-3 text-center text-sm text-ink/60">No money is requested. We arrange physical collection.</p></>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
