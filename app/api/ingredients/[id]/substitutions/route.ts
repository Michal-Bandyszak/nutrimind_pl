import { NextResponse } from 'next/server';
import { getSubstitutions } from '@/lib/services/SubstitutionEngine';
import { apiError, requireApiContext } from '@/lib/auth-context';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiContext();
    const { id } = await params;
    const result = await getSubstitutions(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    const { message, status } = apiError(error, 'Nie znaleziono zamienników.');
    return NextResponse.json({ error: message }, { status: status === 500 ? 404 : status });
  }
}
