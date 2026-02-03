// ============================================================================
// POST SCHEDULING UTILITIES - v5.0 (Fixed Time Parsing)
// ============================================================================

import { toast } from 'sonner';

const IST_TIMEZONE = 'Asia/Kolkata';

// Error messages for scheduling
export const SCHEDULE_ERRORS = {
  PAST_TIME: "That time has already passed. Please choose a future time.",
  INVALID_FORMAT: "I didn't understand that time format. Please use format like '1:30 AM' or '2 PM'.",
  TOO_SOON: "Please schedule at least 2 minutes from now to ensure proper posting.",
  TOO_FAR: "I can only schedule up to 30 days in advance.",
  EXTENSION_ERROR: "There was an issue connecting to the extension. Please try again.",
  NO_CONTENT: "Post content is missing or too short.",
};

/**
 * Parse a natural language time string into a Date object
 * Handles: "1:30 AM", "tomorrow 9 AM", "2:30 PM today", "in 2 hours"
 */
export function parseScheduleTime(
  userInput: string,
  referenceDate: Date = new Date()
): Date | null {
  const lower = userInput.toLowerCase().trim();
  const now = new Date(referenceDate);
  
  console.log('📅 Parsing schedule time:', userInput);
  
  // Handle "post now" / "now" / "immediately"
  if (lower === 'now' || lower.includes('post now') || lower.includes('immediately') || lower.includes('right now')) {
    // Schedule 1 minute in the future for "now" requests
    const result = new Date(now);
    result.setMinutes(result.getMinutes() + 1);
    result.setSeconds(0, 0);
    console.log('⏰ "Now" detected, scheduling for:', result.toISOString());
    return result;
  }
  
  let scheduledDate = new Date(now);
  scheduledDate.setSeconds(0, 0);
  
  // Handle "in X hours/minutes" FIRST (relative time)
  const inHoursMatch = lower.match(/in\s+(\d+)\s*hours?/i);
  if (inHoursMatch) {
    const hoursToAdd = parseInt(inHoursMatch[1]);
    scheduledDate.setHours(scheduledDate.getHours() + hoursToAdd);
    console.log('⏰ "In X hours" detected:', scheduledDate.toISOString());
    return scheduledDate;
  }
  
  const inMinutesMatch = lower.match(/in\s+(\d+)\s*minutes?/i);
  if (inMinutesMatch) {
    const minsToAdd = parseInt(inMinutesMatch[1]);
    scheduledDate.setMinutes(scheduledDate.getMinutes() + minsToAdd);
    console.log('⏰ "In X minutes" detected:', scheduledDate.toISOString());
    return scheduledDate;
  }
  
  // Handle relative day references
  if (lower.includes('tomorrow')) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  } else if (lower.includes('next week')) {
    scheduledDate.setDate(scheduledDate.getDate() + 7);
  }
  
  // Handle day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(`next ${days[i]}`)) {
      const currentDay = scheduledDate.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      scheduledDate.setDate(scheduledDate.getDate() + daysUntil);
      break;
    }
  }
  
  // Extract time from input
  let hours = -1;
  let minutes = 0;
  
  // Match patterns like "1:30 AM", "1:30am", "14:30"
  const timeMatch = lower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3]?.toLowerCase();
    
    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
  } else {
    // Match patterns like "3pm", "3 pm", "3 AM"
    const simpleTimeMatch = lower.match(/(\d{1,2})\s*(am|pm)/i);
    if (simpleTimeMatch) {
      hours = parseInt(simpleTimeMatch[1]);
      const period = simpleTimeMatch[2].toLowerCase();
      
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
    }
  }
  
  // Handle relative times of day without specific time
  if (hours === -1) {
    if (lower.includes('morning')) {
      hours = 9;
    } else if (lower.includes('afternoon')) {
      hours = 14;
    } else if (lower.includes('evening')) {
      hours = 18;
    } else if (lower.includes('tonight')) {
      hours = 20;
    } else {
      // No time found - return null to indicate invalid input
      console.log('❌ Could not parse time from:', userInput);
      return null;
    }
  }
  
  // Set the time
  scheduledDate.setHours(hours, minutes, 0, 0);
  
  // CRITICAL: Check if time is in the past
  if (scheduledDate <= now) {
    // If time is in past and no "tomorrow" mentioned, assume next occurrence
    if (!lower.includes('tomorrow') && !lower.includes('today')) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      console.log('⏰ Time was in past, moved to tomorrow:', scheduledDate.toISOString());
    } else if (lower.includes('today')) {
      // User explicitly said "today" but time has passed
      console.log('❌ Time has already passed today:', scheduledDate.toISOString());
      return null;
    }
  }
  
  console.log('✅ Parsed schedule time:', scheduledDate.toISOString());
  return scheduledDate;
}

/**
 * Validate that a scheduled time is valid
 */
export interface ScheduleValidation {
  valid: boolean;
  error?: string;
}

export function validateScheduleTime(scheduledTime: Date | string): ScheduleValidation {
  const now = new Date();
  const scheduled = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;
  
  // Check 1: Is it a valid date?
  if (isNaN(scheduled.getTime())) {
    return { valid: false, error: SCHEDULE_ERRORS.INVALID_FORMAT };
  }
  
  // Check 2: Is it in the future?
  if (scheduled <= now) {
    return { valid: false, error: SCHEDULE_ERRORS.PAST_TIME };
  }
  
  // Check 3: Is it too far in future? (>30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  if (scheduled > thirtyDaysFromNow) {
    return { valid: false, error: SCHEDULE_ERRORS.TOO_FAR };
  }
  
  // Check 4: Is it at least 2 minutes from now?
  const twoMinutesFromNow = new Date();
  twoMinutesFromNow.setMinutes(twoMinutesFromNow.getMinutes() + 2);
  
  if (scheduled < twoMinutesFromNow) {
    return { valid: false, error: SCHEDULE_ERRORS.TOO_SOON };
  }
  
  return { valid: true };
}

/**
 * Format scheduled time for display in IST
 */
export function formatScheduledTimeForDisplay(isoString: string | Date): string {
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  
  return date.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format scheduled time as relative (Today at, Tomorrow at, etc.)
 */
export function formatRelativeScheduledTime(isoString: string | Date): string {
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const timeStr = date.toLocaleTimeString('en-IN', { 
    timeZone: IST_TIMEZONE,
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
  
  // Compare dates in IST
  const dateIST = new Date(date.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  const nowIST = new Date(now.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  const tomorrowIST = new Date(tomorrow.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  
  const isToday = dateIST.toDateString() === nowIST.toDateString();
  const isTomorrow = dateIST.toDateString() === tomorrowIST.toDateString();
  
  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-IN', { 
      timeZone: IST_TIMEZONE,
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
    }) + ` at ${timeStr}`;
  }
}

/**
 * Create an extension-ready post payload
 */
export interface ExtensionPostPayload {
  id: string;
  content: string;
  imageUrl?: string | null;
  scheduleTime: string;
  trackingId?: string;
}

export function createExtensionPayload(
  postId: string,
  content: string,
  scheduledTime: Date | string,
  options?: {
    imageUrl?: string | null;
    trackingId?: string;
  }
): ExtensionPostPayload {
  const scheduleTime = typeof scheduledTime === 'string' 
    ? scheduledTime 
    : scheduledTime.toISOString();
  
  return {
    id: postId,
    content,
    imageUrl: options?.imageUrl || null,
    scheduleTime,
    trackingId: options?.trackingId,
  };
}

/**
 * Send posts to extension via postMessage
 * Returns a promise that resolves with the extension response
 */
export function sendToExtension(
  posts: ExtensionPostPayload[]
): Promise<{ success: boolean; error?: string; queueLength?: number }> {
  return new Promise((resolve) => {
    console.log('📤 Sending to extension:', posts);
    
    // Send the message
    window.postMessage({
      type: 'SCHEDULE_POSTS',
      posts: posts,
    }, '*');
    
    // Listen for response
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'SCHEDULE_RESULT') {
        window.removeEventListener('message', handler);
        clearTimeout(timeout);
        
        if (event.data.success) {
          console.log('✅ Extension confirmed scheduling:', event.data);
          resolve({ 
            success: true, 
            queueLength: event.data.queueLength || event.data.scheduledCount 
          });
        } else {
          console.error('❌ Extension scheduling failed:', event.data.error);
          resolve({ success: false, error: event.data.error });
        }
      }
    };
    
    window.addEventListener('message', handler);
    
    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      console.error('❌ Extension did not respond');
      resolve({ success: false, error: 'Extension did not confirm scheduling' });
    }, 5000);
  });
}

/**
 * Send a single post for immediate posting
 */
export function postNowToExtension(
  post: { id: string; content: string; imageUrl?: string | null }
): Promise<{ success: boolean; error?: string; linkedinUrl?: string }> {
  return new Promise((resolve) => {
    console.log('📤 Sending POST_NOW to extension:', post);
    
    window.postMessage({
      type: 'POST_NOW',
      post: {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl || null,
      },
    }, '*');
    
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'POST_RESULT' && event.data.postId === post.id) {
        window.removeEventListener('message', handler);
        clearTimeout(timeout);
        
        if (event.data.success) {
          console.log('✅ Post published:', event.data);
          resolve({ 
            success: true, 
            linkedinUrl: event.data.linkedinUrl 
          });
        } else {
          console.error('❌ Posting failed:', event.data.error);
          resolve({ success: false, error: event.data.error });
        }
      }
    };
    
    window.addEventListener('message', handler);
    
    // Timeout after 30 seconds for posting
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ success: false, error: 'Posting timeout' });
    }, 30000);
  });
}
