import { useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

type Point = { time: number; tvl: number; price: number }

const abi = [
  { inputs: [], name: 'getTotalValue', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

type Props = { fundAddress: string; pollMs?: number; maxPoints?: number }

type Timeframe = '1m' | '1h' | '1d' | '5d'
const TF_CONFIG: Record<Timeframe, { windowMs: number; pollMs: number }> = {
  '1m': { windowMs: 60_000, pollMs: 5_000 },
  '1h': { windowMs: 3_600_000, pollMs: 10_000 },
  '1d': { windowMs: 86_400_000, pollMs: 30_000 },
  '5d': { windowMs: 5 * 86_400_000, pollMs: 60_000 },
}

export default function PriceChart({ fundAddress, pollMs = 10000, maxPoints = 720 }: Props) {
  const [data, setData] = useState<Point[]>([])
  const [mode, setMode] = useState<'tvl' | 'price'>('tvl')
  const [timeframe, setTimeframe] = useState<Timeframe>('1h')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const tf = TF_CONFIG[timeframe]
  const effectivePollMs = tf ? tf.pollMs : pollMs
  const windowMs = tf ? tf.windowMs : 3_600_000
  const effectiveMaxKeep = Math.max(maxPoints, Math.ceil(windowMs / effectivePollMs) * 2)

  const formatter = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yLabel = mode === 'tvl' ? 'TVL (ETH)' : 'Share Price (ETH)'

  const fetchPoint = async () => {
    try {
      let provider: ethers.Provider
      // Prefer injected provider if available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        provider = new ethers.BrowserProvider((window as any).ethereum)
      } else {
        // Fallback to public or Infura (sepolia by default)
        const infuraId = process.env.NEXT_PUBLIC_INFURA_ID
        provider = ethers.getDefaultProvider('sepolia', infuraId ? { infura: { apiKey: infuraId } } : undefined)
      }
      const c = new ethers.Contract(fundAddress, abi as any, provider)
      const [tvlBn, tsBn] = await Promise.all([c.getTotalValue(), c.totalSupply()])
      const tvl = Number(ethers.formatEther(tvlBn))
      const ts = tsBn as bigint
      const price = ts > 0n ? Number(ethers.formatEther((tvlBn * 10n ** 18n) / ts)) : 0
      const point: Point = { time: Date.now(), tvl, price }
      setData((prev) => {
        const next = [...prev, point]
        // Keep last N points (configurable / timeframe-aware)
        while (next.length > effectiveMaxKeep) next.shift()
        try {
          if (typeof window !== 'undefined') {
            const key = `price_history_${fundAddress}`
            window.localStorage.setItem(key, JSON.stringify(next))
          }
        } catch {}
        // Fire-and-forget API record (best-effort)
        try {
          fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fundAddress, point }),
          }).catch(() => {})
        } catch {}
        return next
      })
    } catch (e) {
      // swallow errors to keep UI responsive
      // console.error('price poll failed', e)
    }
  }

  useEffect(() => {
    // reset on fund change
    try {
      if (typeof window !== 'undefined') {
        const key = `price_history_${fundAddress}`
        const raw = window.localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) setData(parsed)
        } else {
          setData([])
        }
      } else {
        setData([])
      }
    } catch {
      setData([])
    }
    // initial fetch and interval
    fetchPoint()
    timerRef.current = setInterval(fetchPoint, effectivePollMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundAddress, effectivePollMs, effectiveMaxKeep])

  const seriesKey = mode === 'tvl' ? 'tvl' : 'price'

  const filtered = useMemo(() => {
    const cutoff = Date.now() - windowMs
    return data.filter((p) => p.time >= cutoff)
  }, [data, windowMs])

  const maxY = useMemo(() => {
    return filtered.reduce((m, p) => Math.max(m, p[seriesKey] as number), 0)
  }, [filtered, seriesKey])

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Live {mode === 'tvl' ? 'TVL' : 'Share Price'}</h2>
        <div className="flex gap-2">
          <button onClick={() => setMode('tvl')} className={`px-3 py-1 rounded ${mode === 'tvl' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>TVL</button>
          <button onClick={() => setMode('price')} className={`px-3 py-1 rounded ${mode === 'price' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Share Price</button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Range:</span>
        {(['1m','1h','1d','5d'] as Timeframe[]).map((t) => (
          <button key={t} onClick={() => setTimeframe(t)} className={`px-2 py-1 rounded text-xs ${timeframe === t ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>{t}</button>
        ))}
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={filtered} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tickFormatter={formatter} stroke="#9CA3AF" />
            <YAxis domain={[0, maxY * 1.2]} stroke="#9CA3AF" label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
            <Tooltip labelFormatter={(v) => formatter(Number(v))} formatter={(value) => [value as number, mode === 'tvl' ? 'TVL (ETH)' : 'Price (ETH)']} />
            <Line type="monotone" dataKey={seriesKey} stroke="#10B981" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
