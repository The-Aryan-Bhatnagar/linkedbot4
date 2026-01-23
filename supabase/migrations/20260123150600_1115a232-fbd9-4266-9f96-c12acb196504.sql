-- Add missing columns to user_profiles for daily posting limits
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS daily_post_count INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_post_date TIMESTAMP WITH TIME ZONE;

-- Create function to increment daily post count
CREATE OR REPLACE FUNCTION public.increment_daily_post_count(p_user_id UUID)
RETURNS void AS $$
DECLARE
  current_date_val DATE := CURRENT_DATE;
  last_date DATE;
BEGIN
  SELECT (last_post_date AT TIME ZONE 'UTC')::DATE INTO last_date
  FROM public.user_profiles
  WHERE user_id = p_user_id;
  
  IF last_date IS NULL OR last_date < current_date_val THEN
    -- Reset count for new day
    UPDATE public.user_profiles
    SET daily_post_count = 1,
        last_post_date = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Increment count
    UPDATE public.user_profiles
    SET daily_post_count = daily_post_count + 1,
        last_post_date = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;