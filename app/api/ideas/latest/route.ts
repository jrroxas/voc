import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(req: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Query latest ideas grouped by has_parent, then sort by created_at DESC
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
      FROM (
        SELECT DISTINCT ON (has_parent)
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
        ORDER BY has_parent, created_at DESC
      ) AS latest_ideas
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching latest ideas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch ideas', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
