import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// Line-by-line mask reveal: each line sits inside a clipping wrapper and
// slides up from below it, so the text appears to be uncovered rather than
// simply faded in. This is the effect that makes editorial/agency sites feel
// deliberate - a plain opacity fade reads as generic, a mask reveal reads as
// typeset.
//
// Implementation notes:
// - Takes `lines` as an array rather than splitting a string by rendered line
//   box. Runtime line-splitting (the usual SplitText approach) has to be
//   recalculated on every resize and font swap, and gets it wrong while a
//   webfont is still loading. Explicit lines are stable and need no reflow
//   listener.
// - `once: true` - the reveal plays a single time. Replaying every time a
//   heading scrolls back into view is the thing that makes these sites feel
//   twitchy on a second pass.
// - prefers-reduced-motion renders the text plainly with no transform at all.
export default function RevealText({
  lines = [],
  as: Tag = "h2",
  delay = 0,
  stagger = 0.11,
  style = {},
  lineStyle = {},
  className = "",
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const inner = el.querySelectorAll("[data-reveal-line]")
    const ctx = gsap.context(() => {
      gsap.set(inner, { yPercent: 118 })
      gsap.to(inner, {
        yPercent: 0,
        duration: 1.05,
        delay,
        stagger,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      })
    }, el)

    return () => ctx.revert()
  }, [delay, stagger])

  return (
    <Tag ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <span
          key={i}
          style={{ display: "block", overflow: "hidden", paddingBottom: "0.06em", ...lineStyle }}
        >
          <span data-reveal-line style={{ display: "block", willChange: "transform" }}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}
