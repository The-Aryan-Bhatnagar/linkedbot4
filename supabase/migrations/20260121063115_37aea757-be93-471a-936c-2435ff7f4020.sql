-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- LinkedIn Analytics table - stores profile-level metrics
CREATE TABLE public.linkedin_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT,
  profile_url TEXT,
  followers_count INTEGER DEFAULT 0,
  connections_count INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Post Analytics table - stores individual post metrics
CREATE TABLE public.post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id TEXT NOT NULL,
  content_preview TEXT,
  linkedin_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  post_timestamp TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- LinkedIn Post History table - stores full post content for AI context
CREATE TABLE public.linkedin_post_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_content TEXT NOT NULL,
  post_date TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  linkedin_url TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Writing Style table - stores AI analysis of user's writing patterns
CREATE TABLE public.user_writing_style (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  avg_post_length INTEGER,
  common_topics TEXT[],
  tone_analysis JSONB,
  emoji_usage BOOLEAN DEFAULT false,
  hashtag_style TEXT,
  total_posts_analyzed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.linkedin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_post_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_writing_style ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linkedin_analytics
CREATE POLICY "Users can view their own LinkedIn analytics"
  ON public.linkedin_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LinkedIn analytics"
  ON public.linkedin_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn analytics"
  ON public.linkedin_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for post_analytics
CREATE POLICY "Users can view their own post analytics"
  ON public.post_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own post analytics"
  ON public.post_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own post analytics"
  ON public.post_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for linkedin_post_history
CREATE POLICY "Users can view their own post history"
  ON public.linkedin_post_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own post history"
  ON public.linkedin_post_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own post history"
  ON public.linkedin_post_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own post history"
  ON public.linkedin_post_history FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_writing_style
CREATE POLICY "Users can view their own writing style"
  ON public.user_writing_style FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own writing style"
  ON public.user_writing_style FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own writing style"
  ON public.user_writing_style FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_linkedin_analytics_user ON public.linkedin_analytics(user_id);
CREATE INDEX idx_post_analytics_user ON public.post_analytics(user_id);
CREATE INDEX idx_post_analytics_scraped ON public.post_analytics(user_id, scraped_at DESC);
CREATE INDEX idx_post_history_user ON public.linkedin_post_history(user_id);
CREATE INDEX idx_post_history_date ON public.linkedin_post_history(user_id, post_date DESC);
CREATE INDEX idx_writing_style_user ON public.user_writing_style(user_id);

-- Create trigger for updated_at on linkedin_analytics
CREATE TRIGGER update_linkedin_analytics_updated_at
  BEFORE UPDATE ON public.linkedin_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on post_analytics
CREATE TRIGGER update_post_analytics_updated_at
  BEFORE UPDATE ON public.post_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on user_writing_style
CREATE TRIGGER update_user_writing_style_updated_at
  BEFORE UPDATE ON public.user_writing_style
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();