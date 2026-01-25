import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PostPublishedEvent {
  trackingId?: string;
  postId?: string;
  linkedinUrl?: string;
  postedAt?: string;
}

interface PostFailedEvent {
  postId?: string;
  trackingId?: string;
  error?: string;
}

interface AnalyticsUpdatedEvent {
  postId?: string;
  analytics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

interface ProfileScrapedEvent {
  profile?: {
    fullName?: string;
    headline?: string;
    profilePhoto?: string;
    followersCount?: number;
    connectionsCount?: number;
  };
}

interface ConnectionChangedEvent {
  connected: boolean;
  extensionId?: string;
}

interface ErrorEvent {
  message: string;
  code?: string;
}

/**
 * Global hook to listen for Chrome extension events
 * Invalidates react-query caches and shows toasts on extension actions
 */
export const useExtensionEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for post published - CRITICAL for status update
    const handlePostPublished = (event: CustomEvent<PostPublishedEvent>) => {
      const { postId, trackingId, linkedinUrl } = event.detail;
      
      console.log('✅ Extension Event: Post published', { postId, trackingId, linkedinUrl });
      console.log('🔄 Invalidating all cached queries to re-fetch from database...');
      
      // Force immediate refetch from database - NOT relying on local state
      // Use refetchType: 'all' to ensure data is fetched fresh
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['agents'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-profile'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      
      // Also refetch after a short delay to ensure DB has updated
      setTimeout(() => {
        console.log('🔄 Secondary refetch after 1s delay');
        queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['scheduled-posts'], refetchType: 'all' });
      }, 1000);
      
      toast.success('Post published successfully!', {
        description: linkedinUrl ? 'Click to view on LinkedIn' : undefined,
        action: linkedinUrl ? {
          label: 'View Post',
          onClick: () => window.open(linkedinUrl, '_blank'),
        } : undefined,
      });
    };

    // Listen for post failed
    const handlePostFailed = (event: CustomEvent<PostFailedEvent>) => {
      const { postId, error } = event.detail;
      
      console.log('❌ Extension Event: Post failed', { postId, error });
      
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      
      toast.error('Post failed to publish', {
        description: error || 'Please try again',
      });
    };

    // Listen for analytics update
    const handleAnalyticsUpdated = (event: CustomEvent<AnalyticsUpdatedEvent>) => {
      console.log('📊 Extension Event: Analytics updated');
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
    };

    // Listen for profile scraped
    const handleProfileScraped = (event: CustomEvent<ProfileScrapedEvent>) => {
      console.log('👤 Extension Event: Profile scraped');
      queryClient.invalidateQueries({ queryKey: ['linkedin-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
      toast.success('Profile data refreshed!');
    };

    // Listen for connection status changes
    const handleConnectionChanged = (event: CustomEvent<ConnectionChangedEvent>) => {
      const { connected } = event.detail;
      console.log('🔗 Extension Event: Connection', connected ? 'connected' : 'disconnected');
      
      if (connected) {
        toast.success('Extension connected!');
      } else {
        toast.warning('Extension disconnected');
      }
    };

    // Listen for errors
    const handleError = (event: CustomEvent<ErrorEvent>) => {
      const { message } = event.detail;
      console.error('❌ Extension Event: Error', message);
      toast.error(message || 'An error occurred with the extension');
    };

    // Register all event listeners
    window.addEventListener('linkedbot:post-published', handlePostPublished as EventListener);
    window.addEventListener('linkedbot:post-failed', handlePostFailed as EventListener);
    window.addEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated as EventListener);
    window.addEventListener('linkedbot:profile-scraped', handleProfileScraped as EventListener);
    window.addEventListener('linkedbot:connection-changed', handleConnectionChanged as EventListener);
    window.addEventListener('linkedbot:error', handleError as EventListener);

    return () => {
      window.removeEventListener('linkedbot:post-published', handlePostPublished as EventListener);
      window.removeEventListener('linkedbot:post-failed', handlePostFailed as EventListener);
      window.removeEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated as EventListener);
      window.removeEventListener('linkedbot:profile-scraped', handleProfileScraped as EventListener);
      window.removeEventListener('linkedbot:connection-changed', handleConnectionChanged as EventListener);
      window.removeEventListener('linkedbot:error', handleError as EventListener);
    };
  }, [queryClient]);
};
