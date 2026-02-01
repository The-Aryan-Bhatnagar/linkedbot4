// ============================================================================
// POST LIFECYCLE STATE MACHINE - CLEAN ARCHITECTURE
// ============================================================================
// CRITICAL: Website can ONLY insert status='pending'
// Extension updates to: posting, posted, failed
//
// Status flow:
// pending → posting → posted
//                  ↘ failed

/**
 * Clean post status types matching database constraint
 * Website can ONLY insert 'pending'
 * Extension updates to: posting, posted, failed
 */
export type PostStatus = 'pending' | 'posting' | 'posted' | 'failed';

// Status display labels
export const STATUS_LABELS: Record<PostStatus, string> = {
  pending: 'Queued',
  posting: 'Posting...',
  posted: 'Posted ✓',
  failed: 'Failed ✗',
};

// Status colors for UI
export const STATUS_COLORS: Record<PostStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  posting: { bg: 'bg-blue-500/20', text: 'text-blue-600', border: 'border-blue-500/30' },
  posted: { bg: 'bg-green-500/20', text: 'text-green-600', border: 'border-green-500/30' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500/30' },
};

/**
 * Check if a post can be edited (only pending posts)
 */
export function canEditPost(status: PostStatus): boolean {
  return status === 'pending';
}

/**
 * Check if a post can be deleted
 */
export function canDeletePost(status: PostStatus): boolean {
  return status === 'pending' || status === 'failed';
}

/**
 * Check if post is in a terminal state
 */
export function isTerminalState(status: PostStatus): boolean {
  return status === 'posted' || status === 'failed';
}

/**
 * Check if post is currently being processed
 */
export function isProcessingState(status: PostStatus): boolean {
  return status === 'posting';
}

/**
 * Check if post should be archived (hidden from active list)
 */
export function shouldArchivePost(status: PostStatus): boolean {
  return status === 'posted';
}

// ============================================================================
// PREFLIGHT VALIDATION (for UI feedback only)
// ============================================================================

export interface PreflightValidation {
  valid: boolean;
  errors: string[];
}

export interface PostForValidation {
  content?: string;
  imageUrl?: string;
  imageSkipped?: boolean;
  scheduledTime?: string | Date;
  approved?: boolean;
  status?: PostStatus;
}

/**
 * Validate post before creating (website-side only)
 * Extension owns all status updates
 */
export function validatePreflightForScheduling(post: PostForValidation): PreflightValidation {
  const errors: string[] = [];

  // 1. Content must exist
  if (!post.content || post.content.trim().length < 10) {
    errors.push('Post content is missing or too short (min 10 characters)');
  }

  // Check for AI hallucination patterns
  if (post.content && (
    post.content.includes('"action"') ||
    post.content.includes('dalle.text2im') ||
    post.content.trim().startsWith('{')
  )) {
    errors.push('Post content appears to be invalid');
  }

  // 2. Image must be attached OR explicitly skipped
  if (!post.imageUrl && !post.imageSkipped) {
    errors.push('Image is required or must be explicitly skipped');
  }

  // 3. Scheduled time validation (optional)
  if (post.scheduledTime) {
    const scheduledDate = typeof post.scheduledTime === 'string' 
      ? new Date(post.scheduledTime) 
      : post.scheduledTime;
    
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Scheduled time is invalid');
    } else if (scheduledDate <= new Date()) {
      errors.push('Scheduled time must be in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate for immediate posting
 */
export function validatePreflightForPostNow(post: PostForValidation): PreflightValidation {
  const errors: string[] = [];

  // Content must exist
  if (!post.content || post.content.trim().length < 10) {
    errors.push('Post content is missing or too short');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Legacy exports for backward compatibility
export function canPostNow(status: PostStatus, approved: boolean): boolean {
  return status === 'pending';
}

export function canTransitionTo(currentStatus: PostStatus, newStatus: PostStatus): boolean {
  // Website should not be managing transitions - extension owns this
  return true;
}

export function validateTransition(currentStatus: PostStatus, newStatus: PostStatus): void {
  // No-op - extension owns transitions
}

/**
 * Generate content hash for duplicate detection
 */
export function generateContentHash(content: string): string {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
