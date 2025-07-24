# 🔥 Firebase Setup Guide for CoPlay

## Prerequisites
- Firebase account (free tier is sufficient for development)
- Node.js and bun installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `coplay-app` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Realtime Database

1. In your Firebase project, go to **Build > Realtime Database**
2. Click "Create Database"
3. Choose location (select closest to your users)
4. Start in **test mode** for development (we'll secure it later)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (`</>`)
4. Register app name: `coplay-web`
5. Copy the configuration object

## Step 4: Configure Environment Variables

1. Create `.env.local` file in your project root:

```bash
cp .env.local.example .env.local
```

2. Fill in your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Step 5: Set Up Database Rules (Development)

1. Go to **Realtime Database > Rules**
2. Replace the rules with:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['id', 'code', 'hostId', 'createdAt'])",
        "members": {
          "$userId": {
            ".validate": "newData.hasChildren(['id', 'name', 'isHost', 'isOnline'])"
          }
        },
        "videoState": {
          ".validate": "newData.hasChildren(['currentTime', 'isPlaying', 'lastUpdated', 'updatedBy'])"
        },
        "chat": {
          "$messageId": {
            ".validate": "newData.hasChildren(['userId', 'userName', 'message', 'timestamp', 'type'])"
          }
        }
      }
    }
  }
}
```

3. Click "Publish"

## Step 6: Test Firebase Connection

1. Start your development server:
```bash
bun dev
```

2. Open browser console and check for Firebase connection
3. Try creating a room - it should appear in Firebase Realtime Database

## Step 7: Database Structure

Your Firebase Realtime Database will have this structure:

```
rooms/
  ├── room_123456_abc/
  │   ├── id: "room_123456_abc"
  │   ├── code: "ABC123"
  │   ├── name: "Movie Night"
  │   ├── hostId: "user_123456_def"
  │   ├── createdAt: 1640995200000
  │   ├── updatedAt: 1640995200000
  │   ├── maxMembers: 10
  │   ├── isPrivate: false
  │   ├── settings: {...}
  │   ├── members/
  │   │   ├── user_123456_def/
  │   │   │   ├── id: "user_123456_def"
  │   │   │   ├── name: "John"
  │   │   │   ├── isHost: true
  │   │   │   ├── isOnline: true
  │   │   │   ├── joinedAt: 1640995200000
  │   │   │   └── lastSeen: 1640995200000
  │   │   └── user_789012_ghi/
  │   │       └── {...}
  │   ├── videoState/
  │   │   ├── url: "https://example.com/video.mp4"
  │   │   ├── currentTime: 120.5
  │   │   ├── isPlaying: true
  │   │   ├── lastUpdated: 1640995200000
  │   │   └── updatedBy: "user_123456_def"
  │   └── chat/
  │       ├── message_123/
  │       │   ├── userId: "user_123456_def"
  │       │   ├── userName: "John"
  │       │   ├── message: "Hello everyone!"
  │       │   ├── timestamp: 1640995200000
  │       │   └── type: "message"
  │       └── message_456/
  │           └── {...}
  └── room_789012_xyz/
      └── {...}
```

## Step 8: Production Security Rules

For production, use these more secure rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "members": {
          "$userId": {
            ".write": "$userId == auth.uid || root.child('rooms').child($roomId).child('hostId').val() == auth.uid"
          }
        },
        "videoState": {
          ".write": "auth != null && (root.child('rooms').child($roomId).child('members').child(auth.uid).child('isHost').val() == true || root.child('rooms').child($roomId).child('settings').child('allowGuestControl').val() == true)"
        },
        "chat": {
          ".write": "auth != null && root.child('rooms').child($roomId).child('settings').child('chatEnabled').val() == true"
        }
      }
    }
  }
}
```

## Step 9: Enable Authentication (Optional)

For production, you might want to enable Firebase Authentication:

1. Go to **Build > Authentication**
2. Click "Get started"
3. Choose sign-in methods (Anonymous, Google, etc.)
4. Update your app to use Firebase Auth

## Troubleshooting

### Common Issues:

1. **"Firebase not initialized" error**
   - Check your environment variables
   - Ensure `.env.local` is in project root
   - Restart development server

2. **Permission denied**
   - Check database rules
   - Ensure rules allow read/write access

3. **Connection issues**
   - Check Firebase project settings
   - Verify database URL is correct
   - Check network connectivity

### Debug Commands:

```bash
# Check environment variables
bun run env

# Test Firebase connection
node -e "console.log(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
```

## Features Enabled

✅ **Real-time Room Management**
- Create and join rooms instantly
- Live member list updates
- Automatic disconnect handling

✅ **Video Synchronization**
- Real-time play/pause sync
- Seek position synchronization
- Video loading coordination

✅ **Live Chat**
- Real-time messaging
- System notifications
- Emoji support

✅ **Offline Handling**
- Automatic reconnection
- Presence detection
- Graceful degradation

## Next Steps

1. Test all features in development
2. Set up production Firebase project
3. Configure production security rules
4. Enable Firebase Authentication
5. Set up monitoring and analytics

Your CoPlay app now has full real-time capabilities powered by Firebase! 🚀
