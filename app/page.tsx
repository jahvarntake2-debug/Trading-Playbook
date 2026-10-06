'use client';

import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { NeedRequestCard, type Need } from '@/components/NeedRequestCard';
import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';
import { demoNeeds } from '@/lib/demo-data';

const sampleNeeds: Need[] = demoNeeds;

export default function HomePage() {
  const { data: session } = useSession();
  const [needs, setNeeds] = useState(sampleNeeds);
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);
  const [pledgeQuantity, setPledgeQuantity] = useState(1);
  const [collectionDate, setCollectionDate] = useState('');
  const [pledged, setPledged] = useState(false);

  return (
    <main className="min-h-screen bg-canvas">
      <SiteNav />
      <section className="mx-auto max-w-7xl px-6 py-8 sm:py-12">
        <header className="block-in relative mb-14 overflow-hidden rounded-lg bg-primary p-7 text-white sm:p-12">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-[-70px] right-40 h-36 w-36 rotate-12 bg-secondary/80" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/80">Auckland school supply exchange</p>
              <h1 className="max-w-3xl text-5xl leading-[0.98] sm:text-7xl">Put a supply pack in every student&apos;s hands.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-7 text-white/90 sm:text-xl">Schools list exactly what is missing. You pledge items you already have, we collect them, and the school confirms the delivery.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/donate" className="flex min-h-16 items-center justify-center rounded-md bg-accent px-7 text-lg font-bold text-ink transition-all duration-200 hover:scale-105">Donate supplies</Link>
                <Link href="/request" className="flex min-h-16 items-center justify-center rounded-md border-2 border-white px-7 text-lg font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-white hover:text-primary">Request supplies</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-accent px-4 py-3 text-ink">
                <p className="text-sm font-medium">Open school inventories</p>
                <p className="text-2xl font-bold">3 Auckland requests</p>
              </div>
              <button
                onClick={() => session ? signOut({ callbackUrl: '/login' }) : window.location.assign('/login')}
                className="min-h-12 rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink transition-all duration-200 hover:scale-105 hover:bg-ink hover:text-white"
              >
                {session ? 'Sign out' : 'Sign in'}
              </button>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-4xl sm:text-5xl">What local schools need</h2>
            <p className="max-w-2xl text-lg text-ink/70">Choose items from your home, office, or workplace. No cash changes hands.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-md bg-accent px-4 py-2 text-sm font-semibold uppercase tracking-wider">Physical supplies only</span>
          </div>
        </div>

        <div className="card-grid grid gap-8">
          {needs.map((need) => (
            <NeedRequestCard key={need.id} need={need} onPledge={() => { setSelectedNeed(need); setPledgeQuantity(1); setPledged(false); }} />
          ))}
        </div>

        <section className="mt-14 grid gap-6 rounded-lg bg-secondary p-8 text-white sm:grid-cols-3">
          <div><p className="text-5xl font-extrabold">$0</p><p className="text-base text-white/80">cash requested</p></div>
          <div><p className="text-5xl font-extrabold">185</p><p className="text-base text-white/80">items still needed</p></div>
          <div><p className="text-5xl font-extrabold">100%</p><p className="text-base text-white/80">delivery confirmation goal</p></div>
        </section>
      </section>

      {selectedNeed ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            {pledged ? (
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#28745e]">Pledge received</p>
                <h2 className="text-2xl font-bold text-slate-900">You&apos;re helping {selectedNeed.school.name}</h2>
                <p className="mt-3 text-slate-600">We&apos;ll contact you to confirm collection{collectionDate ? ` on ${collectionDate}` : ''}. Once delivered, the school will share a confirmation photo in your impact history.</p>
                <button onClick={() => setSelectedNeed(null)} className="mt-6 min-h-12 w-full rounded-md bg-primary px-4 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-blue-600">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-sm font-semibold text-[#28745e]">Pledge physical items</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedNeed.itemType}</h2><p className="mt-1 text-sm text-slate-500">For {selectedNeed.school.name}</p></div>
                  <button aria-label="Close pledge dialog" onClick={() => setSelectedNeed(null)} className="text-2xl text-ink/50 transition-colors hover:text-primary">&times;</button>
                </div>
                <label className="mt-6 block text-sm font-medium text-slate-700">How many can you provide?</label>
                <input type="number" min={1} max={selectedNeed.quantityNeeded - selectedNeed.quantityFulfilled} value={pledgeQuantity} onChange={(event) => setPledgeQuantity(Number(event.target.value))} className="mt-2 w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 focus:border-primary focus:bg-white" />
                <label className="mt-4 block text-sm font-medium text-slate-700">Preferred collection date</label>
                <input type="date" value={collectionDate} onChange={(event) => setCollectionDate(event.target.value)} className="mt-2 w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 focus:border-primary focus:bg-white" />
                <button onClick={() => { setNeeds(needs.map((need) => need.id === selectedNeed.id ? { ...need, quantityFulfilled: need.quantityFulfilled + pledgeQuantity } : need)); setPledged(true); }} className="mt-6 min-h-12 w-full rounded-md bg-primary px-4 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-blue-600">Confirm item pledge</button>
                <p className="mt-3 text-center text-xs text-slate-500">Your contact details stay private and are only used to arrange collection.</p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
