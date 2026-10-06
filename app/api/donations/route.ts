import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Security note:
// - Donation creation should be limited to donor-authenticated users.
// - We validate the request against a real need and ensure the donor cannot over-commit beyond remaining need.
// - A production system should also prevent duplicate pending pledges from the same donor for the same need.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { donorId, needRequestId, quantity, collectionDate, donorNote } = body;

    if (!donorId || !needRequestId || !quantity) {
      return NextResponse.json({ error: 'Missing required donation fields.' }, { status: 400 });
    }

    const donor = await prisma.user.findUnique({
      where: { id: donorId },
    });

    if (!donor || donor.role !== 'DONOR') {
      return NextResponse.json({ error: 'Only donor accounts can pledge donations.' }, { status: 403 });
    }

    const need = await prisma.needRequest.findUnique({
      where: { id: needRequestId },
    });

    if (!need) {
      return NextResponse.json({ error: 'Need request not found.' }, { status: 404 });
    }

    const remaining = need.quantityNeeded - need.quantityFulfilled;
    if (Number(quantity) <= 0 || Number(quantity) > remaining) {
      return NextResponse.json(
        { error: `Donation quantity must be between 1 and ${remaining}.` },
        { status: 400 }
      );
    }

    const donation = await prisma.donation.create({
      data: {
        donorId,
        needRequestId,
        quantity: Number(quantity),
        status: 'PENDING',
        collectionDate: collectionDate ? new Date(collectionDate) : undefined,
        donorNote: donorNote || undefined,
      },
    });

    await prisma.needRequest.update({
      where: { id: needRequestId },
      data: {
        quantityFulfilled: need.quantityFulfilled + Number(quantity),
        status: need.quantityFulfilled + Number(quantity) >= need.quantityNeeded ? 'FULFILLED' : 'ACTIVE',
      },
    });

    return NextResponse.json({ data: donation }, { status: 201 });
  } catch (error) {
    console.error('Create donation failed:', error);
    return NextResponse.json({ error: 'Unable to process donation.' }, { status: 500 });
  }
}
