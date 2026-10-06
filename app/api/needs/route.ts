import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Security note:
// - Only verified school accounts should create a NeedRequest.
// - In a production app this should be enforced with server-side auth and role checks.
// - Donors should never be able to write to this route; a session-based auth guard is required.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      schoolId,
      title,
      description,
      category,
      itemType,
      quantityNeeded,
      urgency,
    } = body;

    if (!schoolId || !title || !description || !category || !itemType || !quantityNeeded) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const school = await prisma.user.findUnique({
      where: { id: schoolId },
      include: { schoolProfile: true },
    });

    if (!school || school.role !== 'SCHOOL') {
      return NextResponse.json({ error: 'Only school accounts may create needs.' }, { status: 403 });
    }

    if (!school.schoolProfile?.verified) {
      return NextResponse.json({ error: 'School must be verified before creating requests.' }, { status: 403 });
    }

    const need = await prisma.needRequest.create({
      data: {
        schoolId: school.id,
        title,
        description,
        category,
        itemType,
        quantityNeeded: Number(quantityNeeded),
        quantityFulfilled: 0,
        urgency: urgency ?? 'MEDIUM',
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ data: need }, { status: 201 });
  } catch (error) {
    console.error('Create need request failed:', error);
    return NextResponse.json({ error: 'Unable to create need request.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const activeOnly = searchParams.get('activeOnly') === 'true';
    const category = searchParams.get('category');
    const urgency = searchParams.get('urgency');

    const needs = await prisma.needRequest.findMany({
      where: {
        status: activeOnly ? 'ACTIVE' : undefined,
        category: category ? category : undefined,
        urgency: urgency ? (urgency as any) : undefined,
      },
      include: {
        school: {
          include: {
            schoolProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const filtered = needs.filter((need) => need.quantityFulfilled < need.quantityNeeded);

    const sanitized = filtered.map((need) => ({
      id: need.id,
      title: need.title,
      description: need.description,
      category: need.category,
      itemType: need.itemType,
      quantityNeeded: need.quantityNeeded,
      quantityFulfilled: need.quantityFulfilled,
      urgency: need.urgency,
      status: need.status,
      createdAt: need.createdAt,
      school: {
        id: need.school.id,
        name: need.school.schoolProfile?.schoolName ?? need.school.name,
        city: need.school.schoolProfile?.city ?? 'Auckland',
        suburb: need.school.schoolProfile?.suburb ?? 'Auckland',
        verified: need.school.schoolProfile?.verified ?? false,
      },
    }));

    return NextResponse.json({ data: sanitized }, { status: 200 });
  } catch (error) {
    console.error('Fetch needs failed:', error);
    return NextResponse.json({ error: 'Unable to fetch needs.' }, { status: 500 });
  }
}
