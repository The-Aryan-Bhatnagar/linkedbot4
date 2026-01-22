-- Add tracking and analytics columns for auto-scheduling system
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_with_tracking TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sent_to_extension_at TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_tracking_id ON posts(tracking_id);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_time ON posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Create post analytics history table for tracking changes over time
CREATE TABLE IF NOT EXISTS post_analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new table
ALTER TABLE post_analytics_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_analytics_history
CREATE POLICY "Users can view their own analytics history"
ON post_analytics_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics history"
ON post_analytics_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for analytics history
CREATE INDEX IF NOT EXISTS idx_analytics_history_post_id ON post_analytics_history(post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_history_user_id ON post_analytics_history(user_id);