// LinkedBot Extension Bridge v4.0
// Simplified - NO auth, NO user_id
// Extension handles LinkedIn posting directly

const EXTENSION_CONFIG = {
  version: '4.0',
  supabaseUrl: 'https://glrgfnqdzwbpkcsoxsgd.supabase.co',
};

window.LinkedBotBridge = {
  version: EXTENSION_CONFIG.version,

  // Called by extension when post is published successfully
  onPostPublished: function(data) {
    console.log('🔗 Bridge v4.0: Post published', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:post-published', {
      detail: {
        postId: data.postId,
        trackingId: data.trackingId,
        linkedinUrl: data.linkedinUrl,
        postedAt: data.postedAt || new Date().toISOString()
      }
    }));
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postSuccess',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        linkedinUrl: data.linkedinUrl,
        message: '✅ Posted successfully!'
      }
    }, '*');
    
    this.notifyPostSuccess(data);
  },
  
  // Called by extension when post fails
  onPostFailed: function(data) {
    console.log('🔗 Bridge v4.0: Post failed', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:post-failed', {
      detail: {
        postId: data.postId,
        trackingId: data.trackingId,
        error: data.error || 'Unknown error'
      }
    }));
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postFailed',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        error: data.error || 'Unknown error',
        message: '❌ ' + (data.error || 'Post failed')
      }
    }, '*');
    
    this.notifyPostFailure(data);
  },
  
  // Post scheduled
  onPostScheduled: function(data) {
    console.log('🔗 Bridge v4.0: Post scheduled', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postScheduled',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        scheduledTime: data.scheduleTime,
        message: `✅ Scheduled for ${new Date(data.scheduleTime).toLocaleString()}`
      }
    }, '*');
  },
  
  // Post starting
  onPostStarting: function(data) {
    console.log('🔗 Bridge v4.0: Post starting', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postStarting',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        message: '⏰ Time to post!'
      }
    }, '*');
  },
  
  // Post filling
  onPostFilling: function(data) {
    console.log('🔗 Bridge v4.0: Post filling', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postFilling',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        message: '📝 Filling content...'
      }
    }, '*');
  },
  
  // Queue updated
  onQueueUpdated: function(data) {
    console.log('🔗 Bridge v4.0: Queue updated', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'queueUpdated',
      data: {
        queueLength: data.queueLength,
        message: `Queue: ${data.queueLength} post(s)`
      }
    }, '*');
  },
  
  // Notify backend of successful post (NO user_id required)
  notifyPostSuccess: async function(data) {
    console.log('🔗 Bridge v4.0: notifyPostSuccess', data);
    try {
      const payload = {
        postId: data.postId,
        trackingId: data.trackingId,
        status: 'posted',
        postedAt: data.postedAt || new Date().toISOString(),
        linkedinUrl: data.linkedinUrl
      };
      
      const response = await fetch(`${EXTENSION_CONFIG.supabaseUrl}/functions/v1/sync-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log('🔗 Bridge v4.0: sync-post response:', result);
      return result;
    } catch (error) {
      console.error('🔗 Bridge v4.0: Failed to notify backend:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Notify backend of failed post
  notifyPostFailure: async function(data) {
    try {
      const response = await fetch(`${EXTENSION_CONFIG.supabaseUrl}/functions/v1/sync-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: data.postId,
          trackingId: data.trackingId,
          status: 'failed',
          lastError: data.error || 'Unknown error'
        })
      });
      
      const result = await response.json();
      console.log('🔗 Bridge v4.0: Backend notified of failure:', result);
    } catch (error) {
      console.error('🔗 Bridge v4.0: Failed to notify backend:', error);
    }
  },

  // Analytics updated
  onAnalyticsUpdated: function(data) {
    console.log('🔗 Bridge v4.0: Analytics updated', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:analytics-updated', {
      detail: data
    }));
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'analyticsUpdated',
      data: {
        postId: data.postId,
        analytics: data.analytics,
        message: '📊 Analytics updated'
      }
    }, '*');
  },

  // Connection status changed
  onConnectionStatusChanged: function(data) {
    console.log('🔗 Bridge v4.0: Connection status changed', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:connection-changed', {
      detail: data
    }));
    
    window.postMessage({
      type: data.connected ? 'EXTENSION_CONNECTED' : 'EXTENSION_DISCONNECTED',
      extensionId: data.extensionId,
      version: this.version
    }, '*');
  },

  // Error handler
  onError: function(data) {
    console.error('🔗 Bridge v4.0: Error', data);
    window.dispatchEvent(new CustomEvent('linkedbot:error', {
      detail: data
    }));
  },

  getVersion: function() {
    return EXTENSION_CONFIG.version;
  }
};

// Listen for messages from webapp
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const message = event.data;
  
  // v4.0 - POST_NOW (simplified, NO user_id)
  if (message.type === 'POST_NOW') {
    console.log('🔗 Bridge v4.0: POST_NOW received', message.post);
    
    // Forward to extension via custom event
    window.dispatchEvent(new CustomEvent('linkedbot:post-now', {
      detail: {
        id: message.post.id,
        content: message.post.content,
        imageUrl: message.post.imageUrl
      }
    }));
  }
  
  // v4.0 - SCHEDULE_POSTS (simplified, NO user_id)
  if (message.type === 'SCHEDULE_POSTS') {
    console.log('🔗 Bridge v4.0: SCHEDULE_POSTS received', message.posts);
    
    // Forward to extension via custom event
    window.dispatchEvent(new CustomEvent('linkedbot:schedule-posts', {
      detail: {
        posts: message.posts.map(p => ({
          id: p.id,
          content: p.content,
          imageUrl: p.imageUrl,
          scheduleTime: p.scheduleTime,
          trackingId: p.trackingId
        }))
      }
    }));
    
    // Acknowledge immediately
    window.postMessage({
      type: 'SCHEDULE_RESULT',
      success: true,
      scheduledCount: message.posts.length,
      queueLength: message.posts.length
    }, '*');
  }
  
  // CHECK_EXTENSION
  if (message.type === 'CHECK_EXTENSION') {
    console.log('🔗 Bridge v4.0: CHECK_EXTENSION');
    
    // Check if extension has registered
    const extensionConnected = localStorage.getItem('extension_connected') === 'true';
    const extensionId = localStorage.getItem('extension_id');
    
    window.postMessage({
      type: 'EXTENSION_STATUS',
      connected: extensionConnected,
      extensionId: extensionId
    }, '*');
  }
  
  // CONNECT_EXTENSION
  if (message.type === 'CONNECT_EXTENSION') {
    console.log('🔗 Bridge v4.0: CONNECT_EXTENSION');
    
    window.dispatchEvent(new CustomEvent('linkedbot:connect-request', {
      detail: {}
    }));
  }
  
  // DISCONNECT_EXTENSION
  if (message.type === 'DISCONNECT_EXTENSION') {
    console.log('🔗 Bridge v4.0: DISCONNECT_EXTENSION');
    
    localStorage.removeItem('extension_connected');
    localStorage.removeItem('extension_id');
    
    window.postMessage({
      type: 'EXTENSION_DISCONNECTED'
    }, '*');
  }
  
  // SCRAPE_ANALYTICS
  if (message.type === 'SCRAPE_ANALYTICS') {
    console.log('🔗 Bridge v4.0: SCRAPE_ANALYTICS');
    
    window.dispatchEvent(new CustomEvent('linkedbot:scrape-analytics', {
      detail: {}
    }));
  }
  
  // SCAN_POSTS
  if (message.type === 'SCAN_POSTS') {
    console.log('🔗 Bridge v4.0: SCAN_POSTS', message.limit);
    
    window.dispatchEvent(new CustomEvent('linkedbot:scan-posts', {
      detail: { limit: message.limit || 50 }
    }));
  }
});

console.log('🔗 LinkedBot Bridge v4.0 loaded (simplified - no auth)');
