
# Fix Extension Authentication - Add Access Token to Auth Sync

## Problem Identified

The current implementation sends messages like `SET_USER_ID` and `INITIALIZE_USER` that only include the `userId`. However, the **new extension v3.1.1 requires a `SET_AUTH` message** that includes both:
- `userId` - The user's unique identifier  
- `accessToken` - The Supabase session access token

Without the access token, the extension cannot authenticate API calls and shows "NO USER AUTHENTICATED".

## Solution Overview

Update the authentication sync to:
1. Send the new `SET_AUTH` message type with both `userId` and `accessToken`
2. Include `accessToken` on all auth events (login, signup, session restore, token refresh)
3. Update the extension bridge to handle the new message type

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useUserIdSync.ts` | Add `SET_AUTH` with access token on session sync |
| `src/pages/Login.tsx` | Update `initializeUserInExtension` to include access token |
| `src/pages/Signup.tsx` | Update signup flow to include access token |
| `public/extension-bridge.js` | Add handler for `SET_AUTH` message type |

## Implementation Details

### 1. Update useUserIdSync.ts

Replace the current implementation that only syncs `userId` with one that syncs both `userId` and `accessToken`:

- Use `supabase.auth.getSession()` instead of `getUser()` to get the access token
- Send new `SET_AUTH` message type with both fields
- Handle `TOKEN_REFRESHED` event to keep extension token updated
- Keep legacy message types for backwards compatibility

Key changes:
- Get session instead of just user
- Extract `session.access_token` 
- Send `SET_AUTH` message with both userId and accessToken
- Add `TOKEN_REFRESHED` event handler

### 2. Update Login.tsx initializeUserInExtension

Modify the helper function to:
- Accept optional `accessToken` parameter
- Send `SET_AUTH` message when access token is available
- Fetch session to get access token if not passed directly

### 3. Update extension-bridge.js

Add a handler for the new `SET_AUTH` message type:
- Log receipt of auth data
- Dispatch `linkedbot:set-auth` custom event with both userId and accessToken
- Keep legacy events for compatibility
- Confirm receipt with `AUTH_SET` response message

### 4. Update Signup.tsx

Ensure the signup flow also sends the access token after successful registration.

## Technical Flow

```text
User logs in
     |
     v
supabase.auth.signInWithPassword()
     |
     v
Get session with access_token
     |
     v
window.postMessage({
  type: 'SET_AUTH',
  userId: session.user.id,
  accessToken: session.access_token
})
     |
     v
Extension bridge receives message
     |
     v
Dispatches linkedbot:set-auth event
     |
     v
Extension saves userId AND accessToken
     |
     v
Extension can now make authenticated API calls
```

## Console Logs After Fix

When working correctly, you should see:

**Browser Console:**
```
🔌 Setting up extension auth sync...
📤 Sending auth to extension: d904ee54-09e8...
✅ Auth sent to extension
```

**Extension Console:**
```
🔑 Setting user authentication: d904ee54-09e8...
✅ Authentication saved successfully
```

## Testing Steps

After implementation:
1. Close all LinkedIn tabs
2. Reload extension at chrome://extensions/
3. Refresh the web app page
4. Logout from the app
5. Login again
6. Check browser console for "Auth sent to extension"
7. Try "Post Now" - should work without "NO USER AUTHENTICATED" error
