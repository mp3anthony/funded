import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToSubscriptions } from '@/lib/push';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { title, body, url, icon } = payload;

    if (typeof title !== "string" || typeof body !== "string" || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hardening 9: a caller can only ever push to their own devices. There is no
    // target parameter; the recipient is always the authenticated user.
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found' });
    }

    // Send push
    const result = await sendPushToSubscriptions(subscriptions, { title, body, url, icon });

    // Cleanup expired subscriptions
    if (result.expiredIds && result.expiredIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', result.expiredIds);
    }

    return NextResponse.json({ success: true, results: result });
  } catch (error) {
    console.error('Push send API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
