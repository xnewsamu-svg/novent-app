"use client"

import { useState, useCallback } from "react"

export function useCapsLock() {
  const [capsLock, setCapsLock] = useState(false)

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"))
    }
  }, [])

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"))
    }
  }, [])

  return { capsLock, onKeyDown, onKeyUp }
}
