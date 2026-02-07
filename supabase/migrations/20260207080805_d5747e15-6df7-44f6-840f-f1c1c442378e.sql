-- Create RPC for admins to view all scheduled posts across users
CREATE OR REPLACE FUNCTION public.get_admin_scheduled_posts()
RETURNS TABLE(
  post_id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  content text,
  photo_url text,
  scheduled_time timestamptz,
  status text,
  created_at timestamptz,
  tracking_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id as post_id,
    p.user_id,
    up.name as user_name,
    up.email as user_email,
    p.content,
    p.photo_url,
    p.scheduled_time,
    p.status,
    p.created_at,
    p.tracking_id
  FROM posts p
  LEFT JOIN user_profiles up ON up.user_id = p.user_id
  WHERE p.status IN ('pending', 'posting')
  ORDER BY p.scheduled_time ASC;
$$;