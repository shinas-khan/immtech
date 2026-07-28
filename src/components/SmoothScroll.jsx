import { useEffect } from "react"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

// Inertia smooth-scrolling.
//
// This is the single biggest reason award-site portfolios "feel expensive"
// and ordinary sites don't - it isn't the animations, it's that the scroll
// itself has weight and easing instead of snapping 1:1 to the wheel. Native
// browser scroll jumps in discrete steps; Lenis interpolates toward the
// target each frame.
//
// Two things that are easy to get wrong and are handled here:
//
// 1. ScrollTrigger must be driven BY Lenis, not by the native scroll event.
//    Without the scrollerProxy wiring below, every GSAP scroll animation on
//    the site fires at the wrong position - they'd read the native scrollTop
//    while the page is actually rendered at Lenis's interpolated position,
//    so reveals trigger visibly early or late.
//
// 2. It's disabled entirely for prefers-reduced-motion and on touch devices.
//    Hijacking scroll on a phone is the classic way these sites feel broken -
//    it fights the OS's own momentum physics and breaks pull-to-refresh.
export default function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (reduceMotion || isTouch) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo.out
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    })

    lenis.on("scroll", ScrollTrigger.update)

    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // No scrollerProxy here: Lenis (in its default, no-wrapper config used
    // here) smooths the REAL document scrollTop rather than faking a virtual
    // one, so ScrollTrigger's default window-based measurement already
    // tracks it correctly via the lenis.on("scroll", ...) line above. A
    // scrollerProxy(document.body, ...) was previously added "for safety"
    // but every ScrollTrigger instance in this app omits `scroller:`, so it
    // defaults to `window` and never reads the proxy - it was dead code.
    // Removed rather than wired in, to avoid a second, unused scroll-position
    // source drifting out of sync with the one ScrollTrigger actually uses.
    //
    // The refresh is deliberately delayed rather than called synchronously
    // here. A synchronous refresh() bakes in every ScrollTrigger's start/end
    // pixel position against whatever the DOM measures RIGHT NOW - before
    // webfonts swap in and before the lazy-loaded Hero3D canvas reaches its
    // final height. Anything below the hero (the role-pill / "roles we
    // specialise in" row was the reported case) then has its reveal trigger
    // anchored to a stale, too-short layout, so it fires at the wrong scroll
    // offset - which reads as pills stuck at a partial opacity rather than
    // never appearing, since the tween itself still runs, just mistimed.
    const refresh = () => ScrollTrigger.refresh()
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refresh)
    }
    window.addEventListener("load", refresh)
    const settleTimer = setTimeout(refresh, 1200)

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      window.removeEventListener("load", refresh)
      clearTimeout(settleTimer)
    }
  }, [])

  return null
}
