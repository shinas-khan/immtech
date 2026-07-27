import { useEffect, useRef } from "react"

// Custom cursor: a small solid dot that tracks the pointer 1:1, plus a larger
// ring that lags behind it with spring easing.
//
// The ring reacts to what's underneath it - it swells and inverts over
// anything interactive, and picks up a label from data-cursor="text" so
// hovering the 3D globe can say "explore" rather than nothing.
//
// Deliberately desktop-only: `pointer: coarse` (touch) gets nothing at all,
// since a custom cursor on a device with no cursor is pure dead weight.
// Also skipped for prefers-reduced-motion, because the lagging ring is
// exactly the kind of continuous motion that setting exists to suppress.
export default function Cursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const labelRef = useRef(null)

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (isTouch || reduceMotion) return

    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    if (!dot || !ring) return

    let mx = window.innerWidth / 2, my = window.innerHeight / 2
    let rx = mx, ry = my
    let ringScale = 1, targetScale = 1
    let raf = null
    let visible = false

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
      if (!visible) {
        visible = true
        dot.style.opacity = "1"
        ring.style.opacity = "1"
      }
    }

    const onLeave = () => {
      visible = false
      dot.style.opacity = "0"
      ring.style.opacity = "0"
    }

    // Delegated hover detection - no per-element listeners, so this keeps
    // working for content rendered after mount (job cards, menus, etc).
    const onOver = (e) => {
      const t = e.target.closest("button, a, [role='button'], input, select, textarea, [data-cursor]")
      if (t) {
        const custom = t.getAttribute("data-cursor")
        targetScale = custom ? 2.6 : 1.9
        ring.style.background = custom ? "rgba(0,87,255,0.92)" : "rgba(0,87,255,0.14)"
        ring.style.borderColor = "rgba(0,87,255,0.55)"
        if (label) label.textContent = custom && custom !== "true" ? custom : ""
      } else {
        targetScale = 1
        ring.style.background = "transparent"
        ring.style.borderColor = "rgba(10,15,30,0.28)"
        if (label) label.textContent = ""
      }
    }

    const onDown = () => { targetScale *= 0.78 }
    const onUp = () => { targetScale = targetScale / 0.78 }

    function loop() {
      // Spring toward the pointer. 0.16 gives a noticeable trail without
      // feeling laggy or disconnected from the physical mouse.
      rx += (mx - rx) * 0.16
      ry += (my - ry) * 0.16
      ringScale += (targetScale - ringScale) * 0.18

      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${ringScale})`
      raf = requestAnimationFrame(loop)
    }
    loop()

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseover", onOver, { passive: true })
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    document.addEventListener("mouseleave", onLeave)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseover", onOver)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  return (
    <>
      <style>{`
        /* Only hide the native cursor where ours actually renders. On touch
           or reduced-motion the component returns early and the real cursor
           must stay - hiding it globally would leave those users with no
           cursor at all. */
        @media (pointer: fine) and (prefers-reduced-motion: no-preference) {
          html, body, a, button, [role='button'] { cursor: none !important; }
        }
      `}</style>
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%",
          background: "#0057FF", pointerEvents: "none", zIndex: 9999, opacity: 0,
          transition: "opacity 0.25s", willChange: "transform",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: "fixed", top: 0, left: 0, width: 34, height: 34, borderRadius: "50%",
          border: "1.5px solid rgba(10,15,30,0.28)", pointerEvents: "none", zIndex: 9998,
          opacity: 0, transition: "opacity 0.25s, background 0.3s, border-color 0.3s",
          display: "flex", alignItems: "center", justifyContent: "center", willChange: "transform",
        }}
      >
        <span
          ref={labelRef}
          style={{ fontSize: 4.6, fontWeight: 800, color: "#fff", letterSpacing: 0.2, textTransform: "uppercase", whiteSpace: "nowrap" }}
        />
      </div>
    </>
  )
}
