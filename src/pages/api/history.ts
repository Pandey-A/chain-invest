import type { NextApiRequest, NextApiResponse } from 'next'

// Simple in-memory store (resets on server restart). Replace with a DB in production.
const store: Record<string, Array<{ time: number; tvl: number; price: number }>> = {}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  try {
    const { fundAddress, point } = req.body || {}
    if (!fundAddress || !point) return res.status(400).json({ ok: false, error: 'Missing fields' })
    const key = fundAddress.toLowerCase()
    if (!store[key]) store[key] = []
    store[key].push(point)
    // Optional: trim to last N entries
    if (store[key].length > 5000) store[key].splice(0, store[key].length - 5000)
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'server error' })
  }
}
