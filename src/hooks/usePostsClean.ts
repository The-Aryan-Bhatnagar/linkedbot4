import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Post status types - matching database constraint
 * CRITICAL: Website can ONLY insert 'pending'
 * Extension updates to: posting, posted, failed
 */
export type PostStatus = 'pending' | 'posting' | 'posted' | 'failed';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  photo_url: string | null;
  status: PostStatus;
  scheduled_for: string | null;
  linkedin_post_url: string | null;
  linkedin_post_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePostData {
  content: string;
  photo_url?: string;
  scheduled_for?: string;
}

/**
 * Clean posts hook following strict architecture:
 * - Website ONLY creates posts with status='pending'
 * - Website NEVER updates status to posting/posted/failed
 * - Extension owns all status transitions
 * - Website listens via Supabase realtime for updates
 */
export const usePostsClean = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch posts for current user
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPosts([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      // Cast to our clean Post type
      setPosts((data || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        photo_url: p.photo_url,
        status: (p.status as PostStatus) || 'pending',
        scheduled_for: p.scheduled_time,
        linkedin_post_url: p.linkedin_post_url,
        linkedin_post_id: p.linkedin_post_id,
        last_error: p.last_error,
        created_at: p.created_at,
        updated_at: p.updated_at
      })));
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Create post with status='pending' ONLY
  // Website NEVER sets posted/failed - extension does that
  const createPost = useCallback(async (postData: CreatePostData): Promise<Post | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to create a post.",
          variant: "destructive",
        });
        return null;
      }

      // ✅ CRITICAL: Only insert with status='pending'
      const { data, error: createError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: postData.content,
          photo_url: postData.photo_url || null,
          status: 'pending', // ALWAYS pending - extension updates this
          scheduled_time: postData.scheduled_for || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      const newPost: Post = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        photo_url: data.photo_url,
        status: 'pending',
        scheduled_for: data.scheduled_time,
        linkedin_post_url: data.linkedin_post_url,
        linkedin_post_id: data.linkedin_post_id,
        last_error: data.last_error,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setPosts(prev => [newPost, ...prev]);

      toast({
        title: "Post created",
        description: "Extension will publish it at the scheduled time.",
      });

      return newPost;
    } catch (err) {
      console.error("Error creating post:", err);
      toast({
        title: "Failed to create post",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Delete a post (only allowed for pending posts)
  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const post = posts.find(p => p.id === postId);
      if (post && post.status !== 'pending') {
        toast({
          title: "Cannot delete",
          description: "Only pending posts can be deleted.",
          variant: "destructive",
        });
        return false;
      }

      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (deleteError) throw deleteError;

      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: "Post deleted" });
      return true;
    } catch (err) {
      console.error("Error deleting post:", err);
      toast({
        title: "Failed to delete post",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [posts, toast]);

  // ✅ REALTIME SUBSCRIPTION
  // Listen for status changes from extension (via database)
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('📡 Setting up realtime subscription for posts...');

      const channel = supabase
        .channel('posts-realtime')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'posts',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 Realtime event:', payload.eventType, payload.new);
            
            if (payload.eventType === 'INSERT') {
              const newPost = payload.new as any;
              setPosts(prev => {
                if (prev.find(p => p.id === newPost.id)) return prev;
                return [{
                  id: newPost.id,
                  user_id: newPost.user_id,
                  content: newPost.content,
                  photo_url: newPost.photo_url,
                  status: newPost.status as PostStatus,
                  scheduled_for: newPost.scheduled_time,
                  linkedin_post_url: newPost.linkedin_post_url,
                  linkedin_post_id: newPost.linkedin_post_id,
                  last_error: newPost.last_error,
                  created_at: newPost.created_at,
                  updated_at: newPost.updated_at
                }, ...prev];
              });
            }
            
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any;
              const oldStatus = (payload.old as any)?.status;
              const newStatus = updated.status as PostStatus;
              
              // Update local state
              setPosts(prev => 
                prev.map(post => 
                  post.id === updated.id 
                    ? {
                        ...post,
                        status: newStatus,
                        linkedin_post_url: updated.linkedin_post_url,
                        linkedin_post_id: updated.linkedin_post_id,
                        last_error: updated.last_error,
                        updated_at: updated.updated_at
                      }
                    : post
                )
              );
              
              // Show toast for status transitions
              if (newStatus === 'posted' && oldStatus !== 'posted') {
                toast({
                  title: "Posted ✅",
                  description: "Your LinkedIn post has been published!",
                });
              }
              
              if (newStatus === 'failed' && oldStatus !== 'failed') {
                toast({
                  title: "Post Failed ❌",
                  description: updated.last_error || "Failed to publish your post.",
                  variant: "destructive",
                });
              }
            }
            
            if (payload.eventType === 'DELETE') {
              const deleted = payload.old as any;
              setPosts(prev => prev.filter(p => p.id !== deleted.id));
            }
          }
        )
        .subscribe();

      return () => {
        console.log('📡 Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    fetchPosts,
    createPost,
    deletePost,
  };
};
