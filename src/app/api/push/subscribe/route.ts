import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedPushEndpoint, isValidPushKey } from '@/lib/pushEndpoint';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }
    if (!isAllowedPushEndpoint(subscription.endpoint)) {
      return NextResponse.json({ error: 'Unsupported push endpoint' }, { status: 400 });
    }
    if (!isValidPushKey(subscription.keys.p256dh) || !isValidPushKey(subscription.keys.auth)) {
      return NextResponse.json({ error: 'Invalid subscription keys' }, { status: 400 });
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

    // Upsert subscription
    // The table has a UNIQUE(user_id, endpoint) constraint, so we need to handle conflict
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, endpoint' });

    if (error) {
      console.error('Error saving push subscription:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
