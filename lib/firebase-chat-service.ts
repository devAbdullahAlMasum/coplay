"use client"

import { ref, push, query, orderByChild, limitToLast, onValue, off, DatabaseReference } from 'firebase/database'
import { database } from '@/lib/firebase'
import { firebaseRoomService } from '@/lib/firebase-room-service'

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  type: 'message' | 'system' | 'emoji'
}

interface SystemMessage {
  type: 'user_joined' | 'user_left' | 'host_changed' | 'video_loaded'
  userId?: string
  userName?: string
  data?: any
}

export class FirebaseChatService {
  private chatRef: DatabaseReference | null = null
  private listeners: Array<() => void> = []
  private messageLimit = 100 // Limit messages to last 100

  /**
   * Initialize chat for current room
   */
  initialize(): void {
    const roomId = firebaseRoomService.getCurrentRoomId()
    if (!roomId || !database) return

    this.chatRef = ref(database, `rooms/${roomId}/chat`)
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.chatRef) {
      return { success: false, error: 'Chat not initialized' }
    }

    const currentUserId = firebaseRoomService.getCurrentUserId()
    if (!currentUserId) {
      return { success: false, error: 'User not found' }
    }

    try {
      // Get user name from room service (you might want to store this separately)
      const userName = 'User' // This should come from the current user data

      const chatMessage: Omit<ChatMessage, 'id'> = {
        userId: currentUserId,
        userName,
        message: message.trim(),
        timestamp: Date.now(),
        type: 'message'
      }

      await push(this.chatRef, chatMessage)
      return { success: true }
    } catch (error) {
      console.error('Error sending message:', error)
      return { success: false, error: 'Failed to send message' }
    }
  }

  /**
   * Send a system message
   */
  async sendSystemMessage(systemMessage: SystemMessage): Promise<void> {
    if (!this.chatRef) return

    try {
      const chatMessage: Omit<ChatMessage, 'id'> = {
        userId: 'system',
        userName: 'System',
        message: this.formatSystemMessage(systemMessage),
        timestamp: Date.now(),
        type: 'system'
      }

      await push(this.chatRef, chatMessage)
    } catch (error) {
      console.error('Error sending system message:', error)
    }
  }

  /**
   * Listen to chat messages
   */
  onMessagesUpdate(callback: (messages: ChatMessage[]) => void): () => void {
    if (!this.chatRef) return () => {}

    // Query for the last N messages, ordered by timestamp
    const messagesQuery = query(
      this.chatRef,
      orderByChild('timestamp'),
      limitToLast(this.messageLimit)
    )

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }

      const messagesData = snapshot.val()
      const messages: ChatMessage[] = Object.entries(messagesData).map(([id, data]) => ({
        id,
        ...(data as Omit<ChatMessage, 'id'>)
      }))

      // Sort by timestamp (Firebase should already do this, but just to be sure)
      messages.sort((a, b) => a.timestamp - b.timestamp)

      callback(messages)
    })

    const cleanup = () => {
      off(messagesQuery, 'value', unsubscribe)
    }

    this.listeners.push(cleanup)
    return cleanup
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    if (!this.chatRef) return []

    try {
      const { get } = await import('firebase/database')
      const messagesQuery = query(
        this.chatRef,
        orderByChild('timestamp'),
        limitToLast(limit)
      )
      
      const snapshot = await get(messagesQuery)
      
      if (!snapshot.exists()) return []

      const messagesData = snapshot.val()
      const messages: ChatMessage[] = Object.entries(messagesData).map(([id, data]) => ({
        id,
        ...(data as Omit<ChatMessage, 'id'>)
      }))

      return messages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error('Error getting recent messages:', error)
      return []
    }
  }

  /**
   * Clear chat history (host only)
   */
  async clearChat(): Promise<{ success: boolean; error?: string }> {
    if (!this.chatRef) {
      return { success: false, error: 'Chat not initialized' }
    }

    try {
      const { remove } = await import('firebase/database')
      await remove(this.chatRef)
      return { success: true }
    } catch (error) {
      console.error('Error clearing chat:', error)
      return { success: false, error: 'Failed to clear chat' }
    }
  }

  /**
   * Send emoji reaction
   */
  async sendEmoji(emoji: string): Promise<{ success: boolean; error?: string }> {
    if (!this.chatRef) {
      return { success: false, error: 'Chat not initialized' }
    }

    const currentUserId = firebaseRoomService.getCurrentUserId()
    if (!currentUserId) {
      return { success: false, error: 'User not found' }
    }

    try {
      const userName = 'User' // This should come from the current user data

      const chatMessage: Omit<ChatMessage, 'id'> = {
        userId: currentUserId,
        userName,
        message: emoji,
        timestamp: Date.now(),
        type: 'emoji'
      }

      await push(this.chatRef, chatMessage)
      return { success: true }
    } catch (error) {
      console.error('Error sending emoji:', error)
      return { success: false, error: 'Failed to send emoji' }
    }
  }

  /**
   * Set message limit
   */
  setMessageLimit(limit: number): void {
    this.messageLimit = limit
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.listeners.forEach(cleanup => cleanup())
    this.listeners = []
    this.chatRef = null
  }

  /**
   * Private methods
   */
  private formatSystemMessage(systemMessage: SystemMessage): string {
    switch (systemMessage.type) {
      case 'user_joined':
        return `${systemMessage.userName} joined the room`
      case 'user_left':
        return `${systemMessage.userName} left the room`
      case 'host_changed':
        return `${systemMessage.userName} is now the host`
      case 'video_loaded':
        return `Video loaded: ${systemMessage.data?.title || 'New video'}`
      default:
        return 'System message'
    }
  }
}

// Export singleton instance
export const firebaseChatService = new FirebaseChatService()

// Hook for using chat
export function useChat() {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])

  React.useEffect(() => {
    firebaseChatService.initialize()
    setIsInitialized(true)

    // Set up message listener
    const unsubscribe = firebaseChatService.onMessagesUpdate(setMessages)

    return () => {
      unsubscribe()
      firebaseChatService.cleanup()
      setIsInitialized(false)
    }
  }, [])

  return {
    isInitialized,
    messages,
    sendMessage: firebaseChatService.sendMessage.bind(firebaseChatService),
    sendSystemMessage: firebaseChatService.sendSystemMessage.bind(firebaseChatService),
    sendEmoji: firebaseChatService.sendEmoji.bind(firebaseChatService),
    clearChat: firebaseChatService.clearChat.bind(firebaseChatService),
    getRecentMessages: firebaseChatService.getRecentMessages.bind(firebaseChatService)
  }
}

// Add React import for the hook
import React from 'react'
