// LinkedBot Extension Bridge
// This script allows the extension to communicate with the React app

window.LinkedBotBridge = {
  // Called by extension when post is published
  onPostPublished: function(data) {
    console.log('🔗 Bridge: Post published event received', data);
    window.dispatchEvent(new CustomEvent('linkedbot:post-published', {
      detail: data
    }));
  },

  // Called by extension when analytics are updated
  onAnalyticsUpdated: function(data) {
    console.log('🔗 Bridge: Analytics updated event received', data);
    window.dispatchEvent(new CustomEvent('linkedbot:analytics-updated', {
      detail: data
    }));
  },

  // Called by extension when profile is scraped
  onProfileScraped: function(data) {
    console.log('🔗 Bridge: Profile scraped event received', data);
    window.dispatchEvent(new CustomEvent('linkedbot:profile-scraped', {
      detail: data
    }));
  },

  // Called by extension when connection status changes
  onConnectionStatusChanged: function(data) {
    console.log('🔗 Bridge: Connection status changed', data);
    window.dispatchEvent(new CustomEvent('linkedbot:connection-changed', {
      detail: data
    }));
  },

  // Called by extension when there's an error
  onError: function(data) {
    console.error('🔗 Bridge: Error received', data);
    window.dispatchEvent(new CustomEvent('linkedbot:error', {
      detail: data
    }));
  }
};

console.log('✅ LinkedBot Bridge Ready');
