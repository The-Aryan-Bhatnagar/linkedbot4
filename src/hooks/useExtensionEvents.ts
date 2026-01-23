import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PostPublishedEvent {
  trackingId?: string;
  postId?: string;
  linkedinUrl?: string;
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

export const useExtensionEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for post published
    const handlePostPublished = (event: CustomEvent<PostPublishedEvent>) => {
      const { trackingId, linkedinUrl } = event.detail;
      
      // Refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      console.log('✅ Post published:', linkedinUrl || trackingId);
      toast.success('Post published successfully!');
    };

    // Listen for analytics update
    const handleAnalyticsUpdated = (event: CustomEvent<AnalyticsUpdatedEvent>) => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      console.log('✅ Analytics updated');
    };

    // Listen for profile scraped
    const handleProfileScraped = (event: CustomEvent<ProfileScrapedEvent>) => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
      console.log('✅ Profile scraped');
      toast.success('Profile data refreshed!');
    };

    // Listen for connection status changes
    const handleConnectionChanged = (event: CustomEvent<ConnectionChangedEvent>) => {
      const { connected } = event.detail;
      console.log('🔗 Connection status:', connected ? 'connected' : 'disconnected');
      
      if (connected) {
        toast.success('Extension connected!');
      } else {
        toast.warning('Extension disconnected');
      }
    };

    // Listen for errors
    const handleError = (event: CustomEvent<ErrorEvent>) => {
      const { message } = event.detail;
      console.error('❌ Extension error:', message);
      toast.error(message || 'An error occurred with the extension');
    };

    window.addEventListener('linkedbot:post-published', handlePostPublished as EventListener);
    window.addEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated as EventListener);
    window.addEventListener('linkedbot:profile-scraped', handleProfileScraped as EventListener);
    window.addEventListener('linkedbot:connection-changed', handleConnectionChanged as EventListener);
    window.addEventListener('linkedbot:error', handleError as EventListener);

    return () => {
      window.removeEventListener('linkedbot:post-published', handlePostPublished as EventListener);
      window.removeEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated as EventListener);
      window.removeEventListener('linkedbot:profile-scraped', handleProfileScraped as EventListener);
      window.removeEventListener('linkedbot:connection-changed', handleConnectionChanged as EventListener);
      window.removeEventListener('linkedbot:error', handleError as EventListener);
    };
  }, [queryClient]);
};
