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

    // Anchor links / programmatic scrollTo need to go through Lenis too,
    // otherwise they fight the interpolation and stutter.
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        if (arguments.length) lenis.scrollTo(value, { immediate: true })
        return lenis.animatedScroll
      },
    })
    ScrollTrigger.refresh()

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  return null
}
