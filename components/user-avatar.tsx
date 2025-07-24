"use client"

import Image from "next/image"

interface UserAvatarProps {
  user: { id: string; name: string; avatar: string }
  isActive?: boolean
  size?: "xs" | "sm" | "md" | "lg"
}

export default function UserAvatar({ user, isActive = false, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }

  const indicatorSizes = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  }

  return (
    <div className="relative">
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-[#2A2A2E] bg-[#1A1A1F]`}>
        <Image
          src={user.avatar || "/placeholder.svg"}
          alt={user.name}
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      </div>

      {isActive && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 ${indicatorSizes[size]} bg-[#3D7EFF] rounded-full border-2 border-[#0E0E13]`}
        />
      )}
    </div>
  )
}
