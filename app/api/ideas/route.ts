import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(req: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * pageSize;

    const params: any[] = [];
    let paramIndex = 1;

    const baseWhere = search ? `WHERE full_text ILIKE $${paramIndex++}` : "";
    if (search) params.push(`%${search}%`);

    const groupedQuery = `
      WITH filtered AS (
        SELECT 
          id,
          full_text,
          created_at,
          uuid,
          categories,
          merged,
          has_parent
        FROM ideas
        ${baseWhere}
      ),
      grouped_latest AS (
        SELECT DISTINCT ON (has_parent)
          id,
          full_text,
          created_at,
          uuid,
          categories,
          merged,
          has_parent
        FROM filtered
        ORDER BY has_parent, created_at DESC
      )
      SELECT
        id,
        full_text,
        full_text as "pageContent",
        created_at,
        created_at as "date_created",
        uuid,
        categories,
        merged,
        has_parent,
        0 as "score"
      FROM grouped_latest
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    params.push(pageSize, offset);

    const countParams: any[] = [];
    const countWhere = search ? `WHERE full_text ILIKE $1` : "";
    if (search) countParams.push(`%${search}%`);

    const countQuery = `
      WITH filtered AS (
        SELECT has_parent, created_at FROM ideas ${countWhere}
      ),
      grouped_latest AS (
        SELECT DISTINCT ON (has_parent) has_parent, created_at FROM filtered ORDER BY has_parent, created_at DESC
      )
      SELECT COUNT(*) as total FROM grouped_latest;
    `;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(groupedQuery, params);

    return NextResponse.json({
      ideas: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch ideas', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
