import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

type CatalogItem = {
  symbol: string
  token: string
  feed: string
  defaultFee: number
  defaultTargetBps: number
  defaultMinBps: number
  defaultMaxBps: number
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simple: try to read sepolia-mocks.json from repo root deployments
  try {
    const repoRoot = path.resolve(process.cwd(), '..')
    const p = path.join(repoRoot, 'deployments', 'sepolia-mocks.json')
    if (!fs.existsSync(p)) return res.status(200).json({ network: 'unknown', assets: [] as CatalogItem[] })
    const j = JSON.parse(fs.readFileSync(p, 'utf-8'))
    const mocks = j?.mocks || {}
    const assets: CatalogItem[] = []
    if (mocks.WBTC && mocks.BTC_PRICE_FEED) assets.push({ symbol: 'WBTC', token: mocks.WBTC, feed: mocks.BTC_PRICE_FEED, defaultFee: 3000, defaultTargetBps: 5000, defaultMinBps: 4500, defaultMaxBps: 5500 })
    if (mocks.USDC && mocks.USDC_PRICE_FEED) assets.push({ symbol: 'USDC', token: mocks.USDC, feed: mocks.USDC_PRICE_FEED, defaultFee: 500, defaultTargetBps: 5000, defaultMinBps: 4500, defaultMaxBps: 5500 })
    if (mocks.LINK && mocks.LINK_PRICE_FEED) assets.push({ symbol: 'LINK', token: mocks.LINK, feed: mocks.LINK_PRICE_FEED, defaultFee: 3000, defaultTargetBps: 1000, defaultMinBps: 500, defaultMaxBps: 2000 })
    return res.status(200).json({ network: j?.network || 'sepolia', assets })
  } catch (e) {
    return res.status(200).json({ network: 'unknown', assets: [] as CatalogItem[] })
  }
}
