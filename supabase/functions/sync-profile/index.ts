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
    const { userId, profileData } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update user profile data
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        linkedin_profile_data: profileData,
        profile_last_scraped: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw updateError;
    }

    // Also update linkedin_analytics if profile data contains follower info
    if (profileData?.followersCount || profileData?.connectionsCount) {
      await supabase
        .from('linkedin_analytics')
        .upsert({
          user_id: userId,
          followers_count: profileData.followersCount || 0,
          connections_count: profileData.connectionsCount || 0,
          username: profileData.username || profileData.fullName,
          profile_url: profileData.profileUrl,
          last_synced: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
