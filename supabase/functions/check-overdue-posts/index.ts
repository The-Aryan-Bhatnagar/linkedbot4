import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Fallback job to check for posts that:
 * 1. Are still marked as "scheduled" but past their scheduled_time
 * 2. Have a linkedin_post_url (meaning they were posted but status wasn't updated)
 * 
 * This ensures posts don't get stuck in "scheduled" status forever.
 */
Deno.serve(async (req) => {
  console.log('=== check-overdue-posts called ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find posts that are scheduled but past their time AND have a linkedin_post_url
    // These are posts that were successfully posted but status wasn't synced
    const { data: postsWithUrl, error: urlError } = await supabase
      .from('posts')
      .select('id, user_id, linkedin_post_url, scheduled_time')
      .eq('status', 'scheduled')
      .not('linkedin_post_url', 'is', null)
      .lt('scheduled_time', new Date().toISOString());

    if (urlError) {
      console.error('Error finding posts with URL:', urlError);
    } else if (postsWithUrl && postsWithUrl.length > 0) {
      console.log(`Found ${postsWithUrl.length} posts with URL but still scheduled`);
      
      for (const post of postsWithUrl) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            status: 'posted',
            posted_at: post.scheduled_time || new Date().toISOString(),
            verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Failed to update post ${post.id}:`, updateError);
        } else {
          console.log(`✅ Auto-marked post ${post.id} as posted (had linkedin_post_url)`);
          
          // Notify user
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            title: 'Post Status Updated ✅',
            message: 'A scheduled post has been marked as published.',
            type: 'post',
          });
        }
      }
    }

    // Find posts that are VERY overdue (>1 hour past scheduled time) without URL
    // Mark these as "failed" so user knows something went wrong
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: stuckPosts, error: stuckError } = await supabase
      .from('posts')
      .select('id, user_id, scheduled_time')
      .eq('status', 'scheduled')
      .is('linkedin_post_url', null)
      .lt('scheduled_time', oneHourAgo);

    if (stuckError) {
      console.error('Error finding stuck posts:', stuckError);
    } else if (stuckPosts && stuckPosts.length > 0) {
      console.log(`Found ${stuckPosts.length} posts stuck for over 1 hour`);
      
      for (const post of stuckPosts) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            status: 'failed',
            last_error: 'Post was not published within expected timeframe. Extension may not have been active.',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Failed to mark post ${post.id} as failed:`, updateError);
        } else {
          console.log(`⚠️ Marked overdue post ${post.id} as failed`);
          
          // Notify user
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            title: 'Post Failed ⚠️',
            message: 'A scheduled post could not be published. Please check your extension connection.',
            type: 'post',
          });
        }
      }
    }

    const totalFixed = (postsWithUrl?.length || 0) + (stuckPosts?.length || 0);
    
    return new Response(JSON.stringify({ 
      success: true, 
      postsWithUrlFixed: postsWithUrl?.length || 0,
      stuckPostsMarkedFailed: stuckPosts?.length || 0,
      message: `Processed ${totalFixed} overdue posts`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Check overdue posts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
