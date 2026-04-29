'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';

export async function postMessage(formData: FormData) {
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;
  await pool.query('INSERT INTO messages (body) VALUES ($1)', [body.slice(0, 500)]);
  revalidatePath('/');
}
