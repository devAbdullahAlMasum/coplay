"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { Send, Smile, MoreVertical, Hash } from "lucide-react"
import UserAvatar from "./user-avatar"

interface Message {
  id: string
  userId: string
  text: string
  timestamp: Date
  type: "message" | "system"
}

interface ChatPanelProps {
  user: { id: string; name: string; avatar: string }
  friend: { id: string; name: string; avatar: string }
}

export default function ChatPanel({ user, friend }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      userId: "system",
      text: `${friend.name} joined the room`,
      timestamp: new Date(Date.now() - 300000),
      type: "system",
    },
    {
      id: "2",
      userId: friend.id,
      text: "Hey! Ready to watch this together?",
      timestamp: new Date(Date.now() - 240000),
      type: "message",
    },
    {
      id: "3",
      userId: user.id,
      text: "This is going to be fun! 🍿",
      timestamp: new Date(Date.now() - 180000),
      type: "message",
    },
  ])

  const [newMessage, setNewMessage] = useState("")
  const [friendTyping, setFriendTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock typing indicator
  useEffect(() => {
    if (Math.random() > 0.7) {
      setFriendTyping(true)
      setTimeout(() => setFriendTyping(false), 2000)
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, friendTyping])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      userId: user.id,
      text: newMessage,
      timestamp: new Date(),
      type: "message",
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")

    console.log("Sending message:", message)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="h-full flex flex-col bg-[#1A1A1F]">
      {/* Chat Header */}
      <div className="p-4 border-b border-[#2A2A2E] bg-[#1A1A1F]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-lg">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#EDEDED]">Room Chat</h3>
              <p className="text-xs text-[#9A9A9A]">2 members online</p>
            </div>
          </div>
          <button className="p-2 hover:bg-[rgba(61,126,255,0.1)] rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-[#9A9A9A]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0E0E13]">
        {messages.map((message) => (
          <div key={message.id}>
            {message.type === "system" ? (
              <div className="text-center">
                <span className="text-xs text-[#9A9A9A] bg-[#1A1A1F] px-3 py-1 rounded-full border border-[#2A2A2E]">
                  {message.text}
                </span>
              </div>
            ) : (
              <div className={`flex ${message.userId === user.id ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-end space-x-2 max-w-[85%] ${message.userId === user.id ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <UserAvatar user={message.userId === user.id ? user : friend} isActive={true} size="xs" />
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      message.userId === user.id
                        ? "bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] text-white"
                        : "bg-[#1A1A1F] text-[#EDEDED] border border-[#2A2A2E]"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-xs mt-1 ${message.userId === user.id ? "text-blue-100" : "text-[#9A9A9A]"}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {friendTyping && (
            <div className="flex items-end space-x-2">
              <UserAvatar user={friend} isActive={true} size="xs" />
              <div className="bg-[#1A1A1F] border border-[#2A2A2E] px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-[#3D7EFF] rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-[#2A2A2E] bg-[#1A1A1F]">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-[#0E0E13] border border-[#2A2A2E] rounded-xl text-[#EDEDED] placeholder-[#9A9A9A] resize-none focus:outline-none focus:ring-2 focus:ring-[#3D7EFF] focus:border-transparent transition-all"
              rows={1}
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-[rgba(61,126,255,0.1)] rounded-lg transition-colors">
              <Smile className="w-4 h-4 text-[#9A9A9A]" />
            </button>
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] hover:from-[#2D6EEF] hover:to-[#9249EF] disabled:from-[#2A2A2E] disabled:to-[#2A2A2E] disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-lg"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
