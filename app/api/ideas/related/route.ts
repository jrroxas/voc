import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(req: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { hasParent } = await req.json();

    if (hasParent === null || hasParent === undefined) {
      return NextResponse.json(
        { error: 'has_parent value is required' },
        { status: 400 }
      );
    }

    // Query all ideas with the same has_parent value
    const result = await pool.query(`
      SELECT
        id,
        full_text,
        embedding,
        created_at,
        metadata,
        uuid,
        categories,
        merged,
        has_parent
      FROM ideas
      WHERE has_parent = $1
      ORDER BY created_at DESC;
    `, [hasParent]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching related ideas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch related ideas', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
