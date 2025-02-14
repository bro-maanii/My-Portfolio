"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useEffect, useRef, useCallback } from "react"
import { createNoise3D } from "simplex-noise"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

interface VortexProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  particleCount?: number
  rangeY?: number
  baseHue?: number
  baseSpeed?: number
  rangeSpeed?: number
  baseRadius?: number
  rangeRadius?: number
  backgroundColor?: string
}

export const Vortex = (props: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef(null)
  const { theme } = useTheme()
  const particleCount = props.particleCount || 700
  const particlePropCount = 9
  const particlePropsLength = particleCount * particlePropCount
  const rangeY = props.rangeY || 100
  const baseTTL = 50
  const rangeTTL = 150
  const baseSpeed = props.baseSpeed || 0.0
  const rangeSpeed = props.rangeSpeed || 1.5
  const baseRadius = props.baseRadius || 1
  const rangeRadius = props.rangeRadius || 2
  const baseHue = props.baseHue || (theme === "dark" ? 220 : 180)
  const rangeHue = 100
  const noiseSteps = 3
  const xOff = 0.00125
  const yOff = 0.00125
  const zOff = 0.0005
  const backgroundColor = props.backgroundColor || (theme === "dark" ? "#000000" : "#ffffff")
  const backgroundColorRef = useRef(backgroundColor)
  backgroundColorRef.current = backgroundColor
  let tick = 0
  const noise3D = createNoise3D()
  let particleProps = new Float32Array(particlePropsLength)
  const center = useRef<[number, number]>([0, 0])

  const TAU: number = 2 * Math.PI
  const rand = (n: number): number => n * Math.random()
  const randRange = (n: number): number => n - rand(2 * n)
  const fadeInOut = (t: number, m: number): number => {
    const hm = 0.5 * m
    return Math.abs(((t + hm) % m) - hm) / hm
  }
  const lerp = (n1: number, n2: number, speed: number): number => (1 - speed) * n1 + speed * n2

  const resize = useCallback((canvas: HTMLCanvasElement) => {
    const { innerWidth, innerHeight } = window
    canvas.width = innerWidth
    canvas.height = innerHeight
    center.current[0] = 0.5 * canvas.width
    center.current[1] = 0.5 * canvas.height
  }, [])

  const initParticle = useCallback((i: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const x = rand(canvas.width)
    const y = center.current[1] + randRange(rangeY)
    const vx = 0
    const vy = 0
    const life = 0
    const ttl = baseTTL + rand(rangeTTL)
    const speed = baseSpeed + rand(rangeSpeed)
    const radius = baseRadius + rand(rangeRadius)
    const hue = baseHue + rand(rangeHue)

    particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i)
  }, [rangeY, baseSpeed, rangeSpeed, baseRadius, rangeRadius, baseHue])

  const initParticles = useCallback(() => {
    tick = 0
    particleProps = new Float32Array(particlePropsLength)
    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i)
    }
  }, [particleCount, initParticle])

  const draw = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    tick++

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = backgroundColorRef.current
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    drawParticles(ctx)
    renderGlow(canvas, ctx)
    renderToScreen(canvas, ctx)

    window.requestAnimationFrame(() => draw(canvas, ctx))
  }, [])

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      updateParticle(i, ctx)
    }
  }, [])

  const updateParticle = useCallback((i: number, ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const i2 = 1 + i,
      i3 = 2 + i,
      i4 = 3 + i,
      i5 = 4 + i,
      i6 = 5 + i,
      i7 = 6 + i,
      i8 = 7 + i,
      i9 = 8 + i

    const x = particleProps[i]
    const y = particleProps[i2]
    const n = noise3D(x * xOff, y * yOff, tick * zOff) * noiseSteps * TAU
    const vx = lerp(particleProps[i3], Math.cos(n), 0.5)
    const vy = lerp(particleProps[i4], Math.sin(n), 0.5)
    let life = particleProps[i5]
    const ttl = particleProps[i6]
    const speed = particleProps[i7]
    const x2 = x + vx * speed
    const y2 = y + vy * speed
    const radius = particleProps[i8]
    const hue = particleProps[i9]

    drawParticle(x, y, x2, y2, life, ttl, radius, hue, ctx)

    life++

    particleProps[i] = x2
    particleProps[i2] = y2
    particleProps[i3] = vx
    particleProps[i4] = vy
    particleProps[i5] = life

    if (checkBounds(x, y, canvas) || life > ttl) {
      initParticle(i)
    }
  }, [initParticle])

  const drawParticle = useCallback((
    x: number,
    y: number,
    x2: number,
    y2: number,
    life: number,
    ttl: number,
    radius: number,
    hue: number,
    ctx: CanvasRenderingContext2D,
  ) => {
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineWidth = radius
    ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.closePath()
    ctx.restore()
  }, [])

  const checkBounds = (x: number, y: number, canvas: HTMLCanvasElement) => {
    return x > canvas.width || x < 0 || y > canvas.height || y < 0
  }

  const renderGlow = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.filter = "blur(8px) brightness(200%)"
    ctx.globalCompositeOperation = "lighter"
    ctx.drawImage(canvas, 0, 0)
    ctx.restore()

    ctx.save()
    ctx.filter = "blur(4px) brightness(200%)"
    ctx.globalCompositeOperation = "lighter"
    ctx.drawImage(canvas, 0, 0)
    ctx.restore()
  }, [])

  const renderToScreen = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.drawImage(canvas, 0, 0)
    ctx.restore()
  }, [])

  const setup = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (canvas && container) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        resize(canvas)
        initParticles()
        draw(canvas, ctx)
      }
    }
  }, [resize, initParticles, draw])

  useEffect(() => {
    setup()
    const handleResize = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (canvas && ctx) {
        resize(canvas)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [setup, resize])

  return (
    <div className={cn("relative h-full w-full", props.containerClassName)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        ref={containerRef}
        className="absolute h-full w-full bg-transparent flex items-center justify-center"
      >
        <canvas ref={canvasRef}></canvas>
      </motion.div>

      <div className={cn("relative", props.className)}>{props.children}</div>
    </div>
  )
}