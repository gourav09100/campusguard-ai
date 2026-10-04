import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeToBreakpoint(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  // Subscribing to the media query (instead of setState inside an effect)
  // keeps renders pure and avoids a cascading re-render on mount.
  const isMobile = React.useSyncExternalStore(
    subscribeToBreakpoint,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )

  return isMobile
}
