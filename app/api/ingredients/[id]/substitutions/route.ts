import { NextResponse } from 'next/server';
import { getSubstitutions } from '@/lib/services/SubstitutionEngine';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getSubstitutions(id);
    return NextResponse.json({ data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
