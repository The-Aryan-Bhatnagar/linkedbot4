# LinkedBot Clean Architecture - WEBSITE ONLY

## Architecture Summary

LinkedBot consists of:
1. **React website** (Lovable + Supabase) - YOU ARE HERE
2. **Chrome extension** that posts to LinkedIn

### CRITICAL RULES

| What | Website Can Do | Extension Does |
|------|----------------|----------------|
| Status | Insert `pending` ONLY | Update to `posting`, `posted`, `failed` |
| Post to LinkedIn | ❌ NEVER | ✅ YES |
| Update status | ❌ NEVER | ✅ YES |

---

## Database Schema

### posts table

```sql
-- Status CHECK constraint (clean values only)
CHECK (status = ANY (ARRAY['pending', 'posting', 'posted', 'failed']))
```

| Status | Set By | Meaning |
|--------|--------|---------|
| `pending` | Website | Post created, waiting for extension |
| `posting` | Extension | Currently posting to LinkedIn |
| `posted` | Extension | Successfully published |
| `failed` | Extension | Post failed |

---

## Implementation Files

### 1. `useExtensionAuth.ts` - Session Sync
Syncs Supabase SESSION to Chrome extension for authenticated API calls.
- Message type: `SUPABASE_SESSION`
- Includes: `access_token`, `refresh_token`, `user.id`
- Auth ONLY - NOT for posting

### 2. `usePostsClean.ts` - Post Management
Clean post CRUD with realtime subscription.
- `createPost()`: Inserts with `status: 'pending'` ONLY
- `deletePost()`: Only for pending/failed posts
- Realtime subscription for status updates from extension

### 3. `PostStatusBadge.tsx` - UI Component
Displays post status with proper colors:
- pending → "Queued" (yellow)
- posting → "Posting now..." (blue + spinner)
- posted → "Posted ✅" + LinkedIn URL (green)
- failed → error message (red)

### 4. `postLifecycle.ts` - Status Types
Clean PostStatus type: `'pending' | 'posting' | 'posted' | 'failed'`

---

## Posting Flow

```
Website (React)
└─> User logs in via Supabase
└─> User creates a post
└─> Website inserts row: status = 'pending'
└─> Website STOPS ✋

Extension (separate system)
└─> Polls Supabase for pending posts
└─> Posts to LinkedIn
└─> Updates status: 'posting' → 'posted' or 'failed'

Website
└─> Listens via Supabase realtime
└─> Updates UI based on DB changes
```

---

## What Website Does NOT Do

❌ Call LinkedIn API  
❌ Send posts to extension via postMessage  
❌ Update status to `posted` or `failed`  
❌ Show optimistic "Posted" UI  
❌ Store post queues locally  
❌ Use chrome.alarms  
❌ Fake success toasts  

---

## Testing Checklist

1. [ ] Create post → status is `pending` in database
2. [ ] Toast shows: "Post created. Extension will publish it."
3. [ ] Realtime subscription updates UI when extension changes status
4. [ ] Session synced to extension on login/page load
5. [ ] No website code attempts to update status to posted/failed
