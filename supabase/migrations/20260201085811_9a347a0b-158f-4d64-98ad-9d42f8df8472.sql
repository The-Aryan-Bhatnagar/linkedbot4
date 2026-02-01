-- Update posts table status constraint to match clean architecture
-- Allowed values: pending, posting, posted, failed

-- First, drop the existing constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;

-- Add new constraint with clean status values
ALTER TABLE posts ADD CONSTRAINT posts_status_check 
  CHECK (status = ANY (ARRAY[
    'pending',
    'posting',
    'posted',
    'failed'
  ]::text[]));

-- Update any existing non-compliant statuses to 'pending'
UPDATE posts SET status = 'pending' 
WHERE status NOT IN ('pending', 'posting', 'posted', 'failed');