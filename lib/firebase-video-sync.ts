"use client"

import { ref, set, onValue, off, DatabaseReference } from 'firebase/database'
import { database } from '@/lib/firebase'
import { firebaseRoomService } from '@/lib/firebase-room-service'

interface VideoState {
  url?: string
  currentTime: number
  isPlaying: boolean
  lastUpdated: number
  updatedBy: string
}

interface VideoSyncEvent {
  type: 'play' | 'pause' | 'seek' | 'load'
  currentTime: number
  url?: string
  timestamp: number
  userId: string
}

export class FirebaseVideoSyncService {
  private videoStateRef: DatabaseReference | null = null
  private listeners: Array<() => void> = []
  private lastSyncTime = 0
  private syncTolerance = 1000 // 1 second tolerance

  /**
   * Initialize video sync for current room
   */
  initialize(): void {
    const roomId = firebaseRoomService.getCurrentRoomId()
    if (!roomId || !database) return

    this.videoStateRef = ref(database, `rooms/${roomId}/videoState`)
    this.setupVideoStateListener()
  }

  /**
   * Sync video play state
   */
  async syncPlay(currentTime: number): Promise<void> {
    console.log('🔥 Firebase syncPlay called with currentTime:', currentTime)

    const userId = firebaseRoomService.getCurrentUserId()
    console.log('🔥 Current user ID:', userId)

    const videoState = {
      currentTime,
      isPlaying: true,
      lastUpdated: Date.now(),
      updatedBy: userId || 'unknown'
    }

    console.log('🔥 Syncing play state:', videoState)
    await this.updateVideoState(videoState)
    console.log('🔥 Play state synced successfully')
  }

  /**
   * Sync video pause state
   */
  async syncPause(currentTime: number): Promise<void> {
    console.log('🔥 Firebase syncPause called with currentTime:', currentTime)

    const userId = firebaseRoomService.getCurrentUserId()
    console.log('🔥 Current user ID:', userId)

    const videoState = {
      currentTime,
      isPlaying: false,
      lastUpdated: Date.now(),
      updatedBy: userId || 'unknown'
    }

    console.log('🔥 Syncing pause state:', videoState)
    await this.updateVideoState(videoState)
    console.log('🔥 Pause state synced successfully')
  }

  /**
   * Sync video seek
   */
  async syncSeek(currentTime: number): Promise<void> {
    await this.updateVideoState({
      currentTime,
      lastUpdated: Date.now(),
      updatedBy: firebaseRoomService.getCurrentUserId() || 'unknown'
    })
  }

  /**
   * Sync video load
   */
  async syncLoad(url: string, currentTime: number = 0): Promise<void> {
    await this.updateVideoState({
      url,
      currentTime,
      isPlaying: false,
      lastUpdated: Date.now(),
      updatedBy: firebaseRoomService.getCurrentUserId() || 'unknown'
    })
  }

  /**
   * Listen to video state changes
   */
  onVideoStateChange(callback: (event: VideoSyncEvent) => void): () => void {
    console.log('🔥 Setting up video state change listener')

    if (!this.videoStateRef) {
      console.error('🔥 videoStateRef not initialized for listener')
      return () => {}
    }

    const unsubscribe = onValue(this.videoStateRef, (snapshot) => {
      console.log('🔥 Video state change detected:', snapshot.exists())

      if (!snapshot.exists()) return

      const videoState = snapshot.val() as VideoState
      const currentUserId = firebaseRoomService.getCurrentUserId()

      console.log('🔥 Video state received:', videoState)
      console.log('🔥 Current user ID:', currentUserId)
      console.log('🔥 Updated by:', videoState.updatedBy)

      // Don't sync our own changes
      if (videoState.updatedBy === currentUserId) {
        console.log('🔥 Ignoring own change')
        return
      }

      // Check if this is a recent update to avoid old syncs
      const timeDiff = Date.now() - videoState.lastUpdated
      console.log('🔥 Time diff:', timeDiff)

      if (timeDiff > 5000) {
        console.log('🔥 Ignoring old update')
        return // Ignore updates older than 5 seconds
      }

      // Determine event type based on state changes
      let eventType: VideoSyncEvent['type'] = 'seek'

      if (videoState.url) {
        eventType = 'load'
      } else if (videoState.isPlaying) {
        eventType = 'play'
      } else {
        eventType = 'pause'
      }

      console.log('🔥 Event type determined:', eventType)

      const event: VideoSyncEvent = {
        type: eventType,
        currentTime: videoState.currentTime,
        url: videoState.url,
        timestamp: videoState.lastUpdated,
        userId: videoState.updatedBy
      }

      console.log('🔥 Calling callback with event:', event)
      callback(event)
    })

    const cleanup = () => {
      if (this.videoStateRef) {
        off(this.videoStateRef, 'value', unsubscribe)
      }
    }

    this.listeners.push(cleanup)
    return cleanup
  }

  /**
   * Get current video state
   */
  async getCurrentVideoState(): Promise<VideoState | null> {
    if (!this.videoStateRef) return null

    try {
      const { get } = await import('firebase/database')
      const snapshot = await get(this.videoStateRef)
      return snapshot.exists() ? snapshot.val() as VideoState : null
    } catch (error) {
      console.error('Error getting video state:', error)
      return null
    }
  }

  /**
   * Check if current time is in sync
   */
  isInSync(localTime: number, remoteTime: number): boolean {
    return Math.abs(localTime - remoteTime) <= this.syncTolerance / 1000
  }

  /**
   * Set sync tolerance
   */
  setSyncTolerance(tolerance: number): void {
    this.syncTolerance = tolerance
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.listeners.forEach(cleanup => cleanup())
    this.listeners = []
    this.videoStateRef = null
  }

  /**
   * Private methods
   */
  private async updateVideoState(updates: Partial<VideoState>): Promise<void> {
    if (!this.videoStateRef) return

    try {
      // Get current state first
      const { get } = await import('firebase/database')
      const snapshot = await get(this.videoStateRef)
      const currentState = snapshot.exists() ? snapshot.val() as VideoState : {}

      // Merge updates with current state
      const newState: VideoState = {
        ...currentState,
        ...updates
      }

      await set(this.videoStateRef, newState)
      this.lastSyncTime = Date.now()
    } catch (error) {
      console.error('Error updating video state:', error)
    }
  }

  private setupVideoStateListener(): void {
    // This is handled by the onVideoStateChange method
    // Called when initialize() is called
  }
}

// Export singleton instance
export const firebaseVideoSync = new FirebaseVideoSyncService()

// Hook for using video sync
export function useVideoSync() {
  const [isInitialized, setIsInitialized] = React.useState(false)

  React.useEffect(() => {
    firebaseVideoSync.initialize()
    setIsInitialized(true)

    return () => {
      firebaseVideoSync.cleanup()
      setIsInitialized(false)
    }
  }, [])

  return {
    isInitialized,
    syncPlay: firebaseVideoSync.syncPlay.bind(firebaseVideoSync),
    syncPause: firebaseVideoSync.syncPause.bind(firebaseVideoSync),
    syncSeek: firebaseVideoSync.syncSeek.bind(firebaseVideoSync),
    syncLoad: firebaseVideoSync.syncLoad.bind(firebaseVideoSync),
    onVideoStateChange: firebaseVideoSync.onVideoStateChange.bind(firebaseVideoSync),
    getCurrentVideoState: firebaseVideoSync.getCurrentVideoState.bind(firebaseVideoSync),
    isInSync: firebaseVideoSync.isInSync.bind(firebaseVideoSync),
    setSyncTolerance: firebaseVideoSync.setSyncTolerance.bind(firebaseVideoSync)
  }
}

// Add React import for the hook
import React from 'react'
