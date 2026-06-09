"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"

interface EChartProps {
  // Loosely typed: ECharts' EChartsOption union rejects plain object literals
  // (string-widening on enum-like fields). Options are validated by ECharts at runtime.
  option: Record<string, any>
  className?: string
  style?: React.CSSProperties
}

export default function EChart({ option, className, style }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  // Init / dispose once per mount.
  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)

    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // Push new options whenever they change.
  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />
}
