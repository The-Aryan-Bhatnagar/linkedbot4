import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { trackingId, postId, userId, linkedinUrl, status, postedAt } = await req.json();

    if (!trackingId && !postId) {
      return new Response(JSON.stringify({ error: 'trackingId or postId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update post with LinkedIn URL
    let query = supabase.from('posts').update({
      linkedin_post_url: linkedinUrl,
      status: status || 'posted',
      posted_at: postedAt || new Date().toISOString(),
    });

    if (trackingId) {
      query = query.eq('tracking_id', trackingId);
    } else if (postId) {
      query = query.eq('id', postId);
    }

    const { error: postError } = await query;

    if (postError) {
      console.error('Post update error:', postError);
      throw postError;
    }

    // Increment daily post count if userId provided
    if (userId) {
      const { error: rpcError } = await supabase.rpc('increment_daily_post_count', { 
        p_user_id: userId 
      });
      if (rpcError) {
        console.error('RPC error:', rpcError);
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Post Published 🎉',
        message: 'Your LinkedIn post has been published successfully.',
        type: 'post',
      });

      // Update user profile posts_published_count using raw increment
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('posts_published_count')
        .eq('user_id', userId)
        .single();
      
      if (currentProfile) {
        await supabase
          .from('user_profiles')
          .update({ posts_published_count: (currentProfile.posts_published_count || 0) + 1 })
          .eq('user_id', userId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync post error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
