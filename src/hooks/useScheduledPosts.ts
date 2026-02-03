import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  parseScheduleTime, 
  validateScheduleTime, 
  formatRelativeScheduledTime,
  sendToExtension,
  createExtensionPayload,
  SCHEDULE_ERRORS 
} from '@/lib/scheduling';
import { generatePostTrackingId, embedTrackingId } from '@/lib/postHelpers';
import { formatScheduledTimeIST, isPostDue } from '@/lib/timezoneUtils';

// v4.0 - Clean status lifecycle: pending, posting, posted, failed
type PostStatus = 'pending' | 'posting' | 'posted' | 'failed';

interface ScheduledPost {
  id: string;
  content: string;
  photo_url: string | null;
  scheduled_time: string;
  status: PostStatus;
  tracking_id: string | null;
  retry_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useScheduledPosts() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all user's posts
  const fetchPosts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'posting', 'posted', 'failed']) // v4.0 lifecycle
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      
      setPosts((data || []) as unknown as ScheduledPost[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Schedule a new post - NOW SENDS TO EXTENSION IMMEDIATELY
  const schedulePost = useCallback(async (
    content: string,
    scheduledTime: string | Date,
    photoUrl?: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Step 1: Parse time if it's a natural language string
      let parsedDate: Date;
      if (typeof scheduledTime === 'string' && !scheduledTime.includes('T')) {
        const parsed = parseScheduleTime(scheduledTime);
        if (!parsed) {
          return { success: false, error: SCHEDULE_ERRORS.INVALID_FORMAT };
        }
        parsedDate = parsed;
      } else {
        parsedDate = typeof scheduledTime === 'string' 
          ? new Date(scheduledTime) 
          : scheduledTime;
      }

      // Step 2: Validate time
      const validation = validateScheduleTime(parsedDate);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const isoTime = parsedDate.toISOString();

      // Step 3: Generate tracking ID
      const trackingId = generatePostTrackingId();
      const contentWithTracking = embedTrackingId(content, trackingId);

      // Step 4: Create post in database with status='pending'
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          content_with_tracking: contentWithTracking,
          tracking_id: trackingId,
          photo_url: photoUrl || null,
          scheduled_time: isoTime,
          status: 'pending', // ✅ v4.0 - Always 'pending', extension updates status
          retry_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Post saved to database:', data.id);

      // Step 5: IMMEDIATELY send to extension
      const extensionPayload = createExtensionPayload(
        data.id,
        content,
        isoTime,
        { imageUrl: photoUrl, trackingId }
      );

      console.log('📤 Sending to extension immediately:', extensionPayload);
      
      const extensionResult = await sendToExtension([extensionPayload]);
      
      if (!extensionResult.success) {
        console.error('❌ Extension failed:', extensionResult.error);
        // Still return success since post is in DB, extension will retry
        toast.warning('Post saved, but extension confirmation pending');
      } else {
        console.log('✅ Extension confirmed scheduling');
      }

      // Update local state
      await fetchPosts();

      const displayTime = formatRelativeScheduledTime(isoTime);
      toast.success(`Post scheduled for ${displayTime}`);
      return { success: true, postId: data.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [fetchPosts]);

  // Update post status - v4.0 simplified lifecycle
  const updatePostStatus = useCallback(async (
    postId: string,
    status: PostStatus,
    additionalData?: { 
      linkedin_post_id?: string; 
      linkedin_post_url?: string;
      last_error?: string;
    }
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      if (status === 'posted') {
        updateData.posted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, ...updateData } as ScheduledPost
          : p
      ));

      return { success: true };
    } catch (error) {
      console.error('Error updating post status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Retry a failed post - v4.0 uses 'pending' status
  const retryPost = useCallback(async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      // Schedule for 1 minute from now
      const retryTime = new Date();
      retryTime.setMinutes(retryTime.getMinutes() + 1);
      const isoTime = retryTime.toISOString();

      // Reset retry count and reschedule
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'pending', // v4.0 - Always 'pending'
          retry_count: 0,
          last_error: null,
          next_retry_at: null,
          scheduled_time: isoTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      // Send to extension immediately
      const extensionPayload = createExtensionPayload(
        post.id,
        post.content,
        isoTime,
        { imageUrl: post.photo_url, trackingId: post.tracking_id || undefined }
      );
      
      await sendToExtension([extensionPayload]);

      toast.success('Post queued for retry');
      await fetchPosts();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [posts, fetchPosts]);

  // Delete a post
  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Cancel a scheduled post - just delete it (v4.0 - no draft status)
  const cancelScheduledPost = useCallback(async (postId: string) => {
    try {
      // In v4.0, we delete cancelled posts since there's no 'draft' status
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('status', 'pending'); // Only cancel pending posts

      if (error) throw error;

      // Notify extension to remove from queue
      window.postMessage({
        type: 'CANCEL_POST',
        postId: postId,
      }, '*');

      await fetchPosts();
      toast.success('Post cancelled');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [fetchPosts]);

  // Get posts by status
  const getPostsByStatus = useCallback((status: PostStatus) => {
    return posts.filter(p => p.status === status);
  }, [posts]);

  // Get due posts (for extension to process) - v4.0 uses 'pending'
  const getDuePosts = useCallback(() => {
    return posts.filter(p => 
      p.status === 'pending' && 
      p.scheduled_time && 
      isPostDue(p.scheduled_time)
    );
  }, [posts]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    schedulePost,
    updatePostStatus,
    retryPost,
    deletePost,
    cancelScheduledPost,
    getPostsByStatus,
    getDuePosts,
    fetchPosts,
    // Helpers
    formatScheduledTime: formatScheduledTimeIST,
  };
}
