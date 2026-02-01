import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(req: NextRequest) {
  const connectionString = process.env.DATABASE_URL;
  
  // Log connection attempt (without exposing password)
  const sanitizedUrl = connectionString?.replace(/:[^:@]+@/, ':****@') || 'NOT SET';
  
  try {
    // Test 1: Check if env var exists
    if (!connectionString) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable not set',
        sanitizedUrl,
      }, { status: 500 });
    }

    // Test 2: Try to create pool
    const pool = new Pool({ 
      connectionString,
      connectionTimeoutMillis: 5000, // 5 second timeout
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test 3: Try to connect
    const client = await pool.connect();
    
    // Test 4: Run simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    client.release();
    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      sanitizedUrl,
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      sanitizedUrl,
      errorCode: (error as any)?.code,
      hint: getErrorHint(errorMessage),
    }, { status: 500 });
  }
}

function getErrorHint(errorMessage: string): string {
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return 'Connection timeout - check firewall/security group settings';
  }
  if (errorMessage.includes('ECONNREFUSED')) {
    return 'Connection refused - database not accessible from this network';
  }
  if (errorMessage.includes('authentication failed')) {
    return 'Wrong username or password';
  }
  if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
    return 'Database name is incorrect';
  }
  if (errorMessage.includes('ENOTFOUND')) {
    return 'Host not found - check database URL';
  }
  return 'Check database configuration and network settings';
}
