"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, User, Crown, Users, UserCheck, AlertTriangle } from "lucide-react"

interface Member {
  id: string
  name: string
  isHost: boolean
}

interface UserSettingsProps {
  isHost: boolean
  currentUserName: string
  members: Member[]
  onClose: () => void
  onSave: (settings: { userName: string }) => void
  onTransferHost: (newHostId: string) => void
  onLeaveAfterTransfer: () => void
}

export default function UserSettings({
  isHost,
  currentUserName,
  members,
  onClose,
  onSave,
  onTransferHost,
  onLeaveAfterTransfer,
}: UserSettingsProps) {
  const [userName, setUserName] = useState(currentUserName)
  const [showTransferHost, setShowTransferHost] = useState(false)
  const [selectedNewHost, setSelectedNewHost] = useState("")

  const handleSave = () => {
    if (!userName.trim()) {
      alert("Please enter your name")
      return
    }
    onSave({ userName: userName.trim() })
  }

  const handleTransferHost = () => {
    if (!selectedNewHost) {
      alert("Please select a new host")
      return
    }
    onTransferHost(selectedNewHost)
    onLeaveAfterTransfer()
  }

  const nonHostMembers = members.filter((member) => !member.isHost && member.id !== "1")

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1A1F] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#EDEDED]">Settings</h2>
            {isHost && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-[#3D7EFF] text-white text-xs rounded-full">
                <Crown className="w-3 h-3" />
                <span>HOST</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[rgba(61,126,255,0.1)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#9A9A9A]" />
          </button>
        </div>

        {!showTransferHost ? (
          <>
            {/* Settings Form */}
            <div className="space-y-6">
              {/* User Name */}
              <div>
                <label className="block text-sm font-semibold text-[#EDEDED] mb-2">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-[#0E0E13] border border-[#2A2A2E] rounded-xl text-[#EDEDED] placeholder-[#9A9A9A] focus:outline-none focus:ring-2 focus:ring-[#3D7EFF] focus:border-transparent transition-all"
                  maxLength={20}
                />
              </div>

              {/* Room Members */}
              <div>
                <label className="block text-sm font-semibold text-[#EDEDED] mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Room Members ({members.length})</span>
                  </div>
                </label>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-[#0E0E13] border border-[#2A2A2E] rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[#EDEDED] font-medium">{member.name}</span>
                      </div>
                      {member.isHost && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-[#3D7EFF] text-white text-xs rounded-full">
                          <Crown className="w-3 h-3" />
                          <span>HOST</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Actions */}
              {isHost && nonHostMembers.length > 0 && (
                <div className="bg-[#0E0E13] border border-[#2A2A2E] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[#EDEDED] mb-3 flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-[#3D7EFF]" />
                    <span>Host Actions</span>
                  </h3>
                  <button
                    onClick={() => setShowTransferHost(true)}
                    className="w-full px-4 py-2 bg-[#2A2A2E] hover:bg-[rgba(61,126,255,0.1)] text-[#EDEDED] rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Transfer Host & Leave Room
                  </button>
                  <p className="text-xs text-[#9A9A9A] mt-2">
                    You must transfer host privileges to another member before leaving
                  </p>
                </div>
              )}

              {/* Role Info */}
              <div className="bg-[#0E0E13] border border-[#2A2A2E] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#EDEDED] mb-3 flex items-center space-x-2">
                  {isHost ? (
                    <>
                      <Crown className="w-4 h-4 text-[#3D7EFF]" />
                      <span>Host Privileges</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-[#A259FF]" />
                      <span>Member</span>
                    </>
                  )}
                </h3>
                <ul className="space-y-2 text-sm text-[#9A9A9A]">
                  {isHost ? (
                    <>
                      <li>• Select videos for the room</li>
                      <li>• Control video playback</li>
                      <li>• Manage room settings</li>
                      <li>• Transfer host privileges</li>
                    </>
                  ) : (
                    <>
                      <li>• Watch videos selected by host</li>
                      <li>• Chat with other viewers</li>
                      <li>• Synchronized playback</li>
                      <li>• Leave room anytime</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-8">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#2A2A2E] hover:bg-[rgba(61,126,255,0.1)] text-[#EDEDED] rounded-xl transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] hover:from-[#2D6EEF] hover:to-[#9249EF] text-white rounded-xl transition-all duration-200 font-semibold"
              >
                Save Changes
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Transfer Host */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="text-sm font-semibold text-red-400">Transfer Host Privileges</h3>
                  <p className="text-xs text-red-300">Select a new host before leaving the room</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#EDEDED] mb-3">Select New Host</label>
                <div className="space-y-2">
                  {nonHostMembers.map((member) => (
                    <label
                      key={member.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedNewHost === member.id
                          ? "bg-[#3D7EFF]/10 border-[#3D7EFF]/30"
                          : "bg-[#0E0E13] border-[#2A2A2E] hover:border-[#3D7EFF]/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="newHost"
                        value={member.id}
                        checked={selectedNewHost === member.id}
                        onChange={(e) => setSelectedNewHost(e.target.value)}
                        className="sr-only"
                      />
                      <div className="w-8 h-8 bg-gradient-to-r from-[#3D7EFF] to-[#A259FF] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[#EDEDED] font-medium">{member.name}</span>
                      {selectedNewHost === member.id && <UserCheck className="w-4 h-4 text-[#3D7EFF] ml-auto" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowTransferHost(false)}
                className="flex-1 px-4 py-3 bg-[#2A2A2E] hover:bg-[rgba(61,126,255,0.1)] text-[#EDEDED] rounded-xl transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferHost}
                disabled={!selectedNewHost}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-[#2A2A2E] disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-semibold"
              >
                Transfer & Leave
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
