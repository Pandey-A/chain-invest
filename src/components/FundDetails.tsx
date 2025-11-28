import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import PriceChart from './PriceChart'
import { useCallback } from 'react'
import toast from 'react-hot-toast'

interface FundDetailsProps {
  fundAddress: string
  onBack: () => void
}

// Minimal ABI for ChainIndexFund interactions (read + essential write)
const fundAbi = [
  // ERC20 basics
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  // Fund parameters
  { inputs: [], name: 'managementFee', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'performanceFee', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'lastFeeCollection', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'isPaused', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'minInvestment', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'rebalanceThreshold', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'feeRecipient', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getTotalValue', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  // DEX state
  { inputs: [], name: 'WETH', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'swapRouter', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  // Assets
  { inputs: [], name: 'assetCount', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }], name: 'assets', outputs: [
    { internalType: 'address', name: 'tokenAddress', type: 'address' },
    { internalType: 'address', name: 'priceFeed', type: 'address' },
    { internalType: 'uint256', name: 'targetWeight', type: 'uint256' },
    { internalType: 'uint256', name: 'currentWeight', type: 'uint256' },
    { internalType: 'bool', name: 'isActive', type: 'bool' },
    { internalType: 'uint256', name: 'minWeight', type: 'uint256' },
    { internalType: 'uint256', name: 'maxWeight', type: 'uint256' }
  ], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }], name: 'getAssetPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'poolFee', outputs: [{ type: 'uint24' }], stateMutability: 'view', type: 'function' },
  // Core actions
  { inputs: [], name: 'deposit', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'collectFees', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  // DEX + rebalance (optional)
  {
    inputs: [
      { internalType: 'address', name: 'router', type: 'address' },
      { internalType: 'address', name: 'weth', type: 'address' },
    ],
    name: 'setDEX',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
    ],
    name: 'setPoolFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'previewRebalance',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'currentWeight', type: 'uint256' },
          { internalType: 'uint256', name: 'targetWeight', type: 'uint256' },
          { internalType: 'uint256', name: 'deltaWeight', type: 'uint256' },
          { internalType: 'bool', name: 'sell', type: 'bool' },
          { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        internalType: 'struct ChainIndexFund.TradeSuggestion[]',
        name: 'suggestions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rebalance',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Admin: add assets
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'priceFeed', type: 'address' },
      { internalType: 'uint256', name: 'targetWeight', type: 'uint256' },
      { internalType: 'uint256', name: 'minWeight', type: 'uint256' },
      { internalType: 'uint256', name: 'maxWeight', type: 'uint256' },
    ],
    name: 'addAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

type Suggestion = {
  token: string
  currentWeight: bigint
  targetWeight: bigint
  deltaWeight: bigint
  sell: boolean
  tokenAmount: bigint
  value: bigint
}

export default function FundDetails({ fundAddress, onBack }: FundDetailsProps) {
  const { address, isConnected } = useAccount()
  const [router, setRouter] = useState('')
  const [weth, setWeth] = useState('')
  const [chainRouter, setChainRouter] = useState<string>('')
  const [chainWeth, setChainWeth] = useState<string>('')
  const [dexConfigured, setDexConfigured] = useState<boolean>(false)
  const [editDex, setEditDex] = useState<boolean>(false)
  const [poolToken, setPoolToken] = useState('')
  const [poolFee, setPoolFeeVal] = useState<number>(3000)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [fundName, setFundName] = useState('')
  const [fundSymbol, setFundSymbol] = useState('')
  const [tvl, setTvl] = useState<bigint | null>(null)
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null)
  const [userShares, setUserShares] = useState<bigint | null>(null)
  const [mgmtFee, setMgmtFee] = useState<number>(0)
  const [perfFee, setPerfFee] = useState<number>(0)
  const [paused, setPaused] = useState<boolean>(false)
  const [minInv, setMinInv] = useState<bigint | null>(null)
  const [threshold, setThreshold] = useState<number>(0)
  const [feeRecipient, setFeeRecipient] = useState<string>('')
  const [owner, setOwner] = useState<string>('')
  const [assets, setAssets] = useState<any[]>([])
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol?: string; name?: string }>>({})
  const [depositEth, setDepositEth] = useState('')
  const [withdrawShares, setWithdrawShares] = useState('')
  const [assetToken, setAssetToken] = useState('')
  const [assetFeed, setAssetFeed] = useState('')
  const [assetTargetBps, setAssetTargetBps] = useState<number>(0)
  const [assetMinBps, setAssetMinBps] = useState<number>(0)
  const [assetMaxBps, setAssetMaxBps] = useState<number>(0)
  const [catalog, setCatalog] = useState<any[]>([])
  const [addingFromCatalog, setAddingFromCatalog] = useState<string>('')

  const getContract = async (withSigner = false) => {
    if (typeof window === 'undefined') throw new Error('Window not available')
    if (!(window as any).ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider((window as any).ethereum)
    if (withSigner) {
      const signer = await provider.getSigner()
      return new ethers.Contract(fundAddress, fundAbi, signer)
    }
    return new ethers.Contract(fundAddress, fundAbi, provider)
  }

  const isOwner = useMemo(() => {
    if (!owner || !address) return false
    return owner.toLowerCase() === address.toLowerCase()
  }, [owner, address])

  const refresh = async () => {
    try {
      setLoading(true)
      const c = await getContract(false)
      const [nm, sym, tvlVal, ts, mf, pf, pausedVal, minI, th, fr, ownr, wAddr, rAddr] = await Promise.all([
        c.name(), c.symbol(), c.getTotalValue(), c.totalSupply(), c.managementFee(), c.performanceFee(), c.isPaused(), c.minInvestment(), c.rebalanceThreshold(), c.feeRecipient(), c.owner(), c.WETH(), c.swapRouter()
      ])
      setFundName(nm)
      setFundSymbol(sym)
      setTvl(tvlVal)
      setTotalSupply(ts)
      setMgmtFee(Number(mf))
      setPerfFee(Number(pf))
      setPaused(Boolean(pausedVal))
      setMinInv(minI)
      setThreshold(Number(th))
      setFeeRecipient(fr)
      setOwner(ownr)
      setChainWeth(wAddr)
      setChainRouter(rAddr)
      const configured = !!wAddr && wAddr !== '0x0000000000000000000000000000000000000000' && !!rAddr && rAddr !== '0x0000000000000000000000000000000000000000'
      setDexConfigured(configured)
      // Pre-fill inputs from on-chain if present
      if (configured) {
        if (!weth) setWeth(wAddr)
        if (!router) setRouter(rAddr)
      }
      if (address) {
        const bal: bigint = await c.balanceOf(address)
        setUserShares(bal)
      } else {
        setUserShares(null)
      }
      // Load assets
  const count: bigint = await c.assetCount()
      const arr: any[] = []
      for (let i = 0n; i < count; i++) {
        const a = await c.assets(i)
        const price: bigint = await c.getAssetPrice(i)
        let fee: number | null = null
        try {
          fee = Number(await c.poolFee(a.tokenAddress))
        } catch {}
        // IMPORTANT: ethers v6 returns array-like structs; named fields may be non-enumerable.
        // Avoid spreading `a` directly, which would drop named props. Map explicitly.
        arr.push({
          id: Number(i),
          tokenAddress: a.tokenAddress,
          priceFeed: a.priceFeed,
          targetWeight: a.targetWeight,
          currentWeight: a.currentWeight,
          isActive: a.isActive,
          minWeight: a.minWeight,
          maxWeight: a.maxWeight,
          price,
          poolFee: fee,
        })
      }
      setAssets(arr)
      // kick off symbol lookups lazily
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const erc20Abi = [
          { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
          { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
        ]
        const metas: Record<string, { symbol?: string; name?: string }> = {}
        await Promise.all(arr.map(async (it) => {
          try {
            const c20 = new ethers.Contract(it.tokenAddress, erc20Abi, provider)
            const [sym, nm] = await Promise.all([c20.symbol(), c20.name()])
            metas[it.tokenAddress] = { symbol: sym, name: nm }
          } catch {
            metas[it.tokenAddress] = {}
          }
        }))
        setTokenMeta((prev) => ({ ...prev, ...metas }))
      } catch {}
    } catch (e) {
      console.error('refresh failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundAddress, address])

  // Load asset catalog from API (derived from deployments/*-mocks.json)
  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((j) => setCatalog(Array.isArray(j.assets) ? j.assets : []))
      .catch(() => setCatalog([]))
  }, [])

  // Pre-fill router/WETH from env if provided
  useEffect(() => {
    const r = (process.env.NEXT_PUBLIC_UNI_V3_ROUTER as string) || ''
    const w = (process.env.NEXT_PUBLIC_WETH as string) || ''
    if (r && !router) setRouter(r)
    if (w && !weth) setWeth(w)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onConfigureDEX = async () => {
    try {
      setLoading(true)
      const toastId = toast.loading('Configuring DEX...')
      const c = await getContract(true)
      const tx = await c.setDEX(router, weth)
      await tx.wait()
      toast.success('DEX configured successfully!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to configure DEX')
    } finally {
      setLoading(false)
    }
  }

  const onDeposit = async () => {
    try {
      if (!depositEth || Number(depositEth) <= 0) return
      setLoading(true)
      const toastId = toast.loading('Processing deposit...')
      const c = await getContract(true)
      const tx = await c.deposit({ value: ethers.parseEther(depositEth) })
      await tx.wait()
      setDepositEth('')
      await refresh()
      toast.success('Deposit completed successfully!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Deposit failed')
    } finally {
      setLoading(false)
    }
  }

  const onWithdraw = async () => {
    try {
      if (!withdrawShares || Number(withdrawShares) <= 0) return
      setLoading(true)
      const toastId = toast.loading('Processing withdrawal...')
      const c = await getContract(true)
      const tx = await c.withdraw(ethers.parseUnits(withdrawShares, 18))
      await tx.wait()
      setWithdrawShares('')
      await refresh()
      toast.success('Withdrawal completed successfully!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const onCollectFees = async () => {
    try {
      setLoading(true)
      const toastId = toast.loading('Collecting fees...')
      const c = await getContract(true)
      const tx = await c.collectFees()
      await tx.wait()
      await refresh()
      toast.success('Fees collected successfully!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to collect fees')
    } finally {
      setLoading(false)
    }
  }

  const onPauseToggle = async () => {
    try {
      setLoading(true)
      const action = paused ? 'Unpausing' : 'Pausing'
      const toastId = toast.loading(`${action} fund...`)
      const c = await getContract(true)
      const tx = await (paused ? c.unpause() : c.pause())
      await tx.wait()
      await refresh()
      toast.success(`Fund ${paused ? 'unpaused' : 'paused'} successfully!`, { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to pause/unpause fund')
    } finally {
      setLoading(false)
    }
  }

  const onSetPoolFee = async () => {
    try {
      setLoading(true)
      const toastId = toast.loading('Setting pool fee...')
      const c = await getContract(true)
      const tx = await c.setPoolFee(poolToken, poolFee)
      await tx.wait()
      toast.success('Pool fee set successfully!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to set pool fee')
    } finally {
      setLoading(false)
    }
  }

  const onPreview = async () => {
    try {
      setLoading(true)
      const toastId = toast.loading('Fetching rebalance preview...')
      const c = await getContract(false)
      const res: Suggestion[] = await c.previewRebalance()
      setSuggestions(res)
      toast.success('Rebalance preview loaded!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load rebalance preview')
    } finally {
      setLoading(false)
    }
  }

  const onRebalance = async () => {
    try {
      setLoading(true)
      const toastId = toast.loading('Rebalancing fund...')
      const c = await getContract(true)
      const tx = await c.rebalance()
      await tx.wait()
      toast.success('Fund rebalanced successfully!', { id: toastId })
      setSuggestions(null)
    } catch (e: any) {
      toast.error(e?.message || 'Rebalance failed')
    } finally {
      setLoading(false)
    }
  }

  const onAddAsset = async () => {
    try {
      if (!assetToken || !assetFeed) return
      setLoading(true)
      const toastId = toast.loading('Adding asset...')
      const c = await getContract(true)
      // Expect basis points (e.g., 5000 = 50%)
      const tx = await c.addAsset(
        assetToken,
        assetFeed,
        BigInt(assetTargetBps),
        BigInt(assetMinBps),
        BigInt(assetMaxBps)
      )
      await tx.wait()
      setAssetToken(''); setAssetFeed('')
      setAssetTargetBps(0); setAssetMinBps(0); setAssetMaxBps(0)
      await refresh()
      toast.success('Asset added successfully!', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add asset')
    } finally {
      setLoading(false)
    }
  }

  const addCatalogItem = useCallback(async (item: any) => {
    try {
      setAddingFromCatalog(item.symbol)
      setLoading(true)
      const toastId = toast.loading(`Adding ${item.symbol}...`)
      const c = await getContract(true)
      const tx = await c.addAsset(
        item.token,
        item.feed,
        BigInt(item.defaultTargetBps),
        BigInt(item.defaultMinBps),
        BigInt(item.defaultMaxBps)
      )
      await tx.wait()
      // Optionally set default pool fee
      try {
        const tx2 = await c.setPoolFee(item.token, item.defaultFee)
        await tx2.wait()
      } catch {}
      await refresh()
      toast.success(`${item.symbol} added successfully!`, { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || `Failed to add ${item?.symbol || 'asset'}`)
    } finally {
      setLoading(false)
      setAddingFromCatalog('')
    }
  }, [])

  const fmtPct = (bps: any) => {
    if (bps === null || bps === undefined) return '—'
    const n = typeof bps === 'bigint' ? Number(bps) : Number(bps)
    if (!Number.isFinite(n)) return '—'
    return `${(n / 100).toFixed(2)}%`
  }
  const fmtAmount = (v: bigint) => ethers.formatEther(v)

  const sharePrice = useMemo(() => {
    if (!tvl || !totalSupply || totalSupply === 0n) return '0'
    return ethers.formatEther((tvl * 10n ** 18n) / totalSupply)
  }, [tvl, totalSupply])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-primary-600 hover:text-primary-700"
      >
        ← Back to Funds
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{fundName || 'Fund'} ({fundSymbol || 'SHARE'})</h1>
          <p className="text-gray-600 dark:text-gray-400 font-mono break-all">{fundAddress}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Stat label="TVL (ETH)">{tvl ? ethers.formatEther(tvl) : '—'}</Stat>
            <Stat label="Total Supply">{totalSupply ? ethers.formatUnits(totalSupply, 18) : '—'}</Stat>
            <Stat label="Share Price (ETH)">{sharePrice}</Stat>
            <Stat label="Your Shares">{userShares ? ethers.formatUnits(userShares, 18) : '—'}</Stat>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
            <Stat label="Mgmt Fee">{(mgmtFee / 100).toFixed(2)}%</Stat>
            <Stat label="Perf Fee">{(perfFee / 100).toFixed(2)}%</Stat>
            <Stat label="Min Invest (ETH)">{minInv ? ethers.formatEther(minInv) : '—'}</Stat>
            <Stat label="Rebalance Thresh">{(threshold / 100).toFixed(2)}%</Stat>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Fee Recipient: {feeRecipient}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Status: {paused ? 'Paused' : 'Active'}</div>
        </div>

  {/* Live Chart */}
  <PriceChart fundAddress={fundAddress} />

        {/* Invest / Withdraw */}
        <section className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Invest / Withdraw</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Deposit ETH</label>
              <div className="flex gap-2 mt-2">
                <input className="flex-1 rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700" placeholder="e.g., 0.05" value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
                <button onClick={onDeposit} disabled={!isConnected || loading || !depositEth} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Deposit</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Withdraw Shares</label>
              <div className="flex gap-2 mt-2">
                <input className="flex-1 rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700" placeholder="e.g., 1.0" value={withdrawShares} onChange={(e) => setWithdrawShares(e.target.value)} />
                <button onClick={onWithdraw} disabled={!isConnected || loading || !withdrawShares} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Withdraw</button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={onCollectFees} disabled={!isConnected || loading} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">Collect Fees</button>
            <button onClick={onPauseToggle} disabled={!isConnected || loading || !isOwner} className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50">{paused ? 'Unpause' : 'Pause'}</button>
            {!isOwner && <span className="text-xs text-gray-500">Owner-only action</span>}
          </div>
        </section>

        {/* DEX Configuration 
        <section className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">DEX Configuration</h2>
          {dexConfigured && !editDex ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Configured</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="w-full rounded border px-3 py-2 bg-gray-100 dark:bg-gray-900 dark:border-gray-700" value={chainRouter} readOnly />
                <input className="w-full rounded border px-3 py-2 bg-gray-100 dark:bg-gray-900 dark:border-gray-700" value={chainWeth} readOnly />
              </div>
              <button onClick={() => setEditDex(true)} className="mt-3 inline-flex items-center px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Reconfigure</button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                  placeholder="Uniswap V3 Router address"
                  value={router}
                  onChange={(e) => setRouter(e.target.value)}
                />
                <input
                  className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                  placeholder="WETH address"
                  value={weth}
                  onChange={(e) => setWeth(e.target.value)}
                />
              </div>
              <button
                onClick={async () => { await onConfigureDEX(); setEditDex(false); await refresh(); }}
                disabled={!isConnected || loading || !router || !weth}
                className="mt-3 inline-flex items-center px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {dexConfigured ? 'Save DEX Config' : 'Configure DEX'}
              </button>
            </div>
          )}
        </section>
        */}

        {/* Pool Fee */}
        <section className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Set Pool Fee</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
              placeholder="Token address"
              value={poolToken}
              onChange={(e) => setPoolToken(e.target.value)}
            />
            <input
              className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
              placeholder="Fee tier (e.g., 500, 3000, 10000)"
              type="number"
              value={poolFee}
              onChange={(e) => setPoolFeeVal(Number(e.target.value))}
            />
            <button
              onClick={onSetPoolFee}
              disabled={!isConnected || loading || !poolToken}
              className="inline-flex items-center px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Save Fee
            </button>
          </div>
        </section>

  {/* Rebalance Preview */}
        <section className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Rebalance</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onPreview}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Preview Rebalance
            </button>
            <button
              onClick={onRebalance}
              disabled={!isConnected || loading}
              className="inline-flex items-center px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Execute Rebalance
            </button>
          </div>
          {suggestions && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Current</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Delta</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Token Amt</th>
                    <th className="py-2 pr-4">Value (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s, i) => (
                    <tr key={i} className="border-t dark:border-gray-700">
                      <td className="py-2 pr-4 font-mono">{s.token}</td>
                      <td className="py-2 pr-4">{fmtPct(s.currentWeight)}</td>
                      <td className="py-2 pr-4">{fmtPct(s.targetWeight)}</td>
                      <td className="py-2 pr-4">{fmtPct(s.deltaWeight)}</td>
                      <td className="py-2 pr-4">{s.sell ? 'Sell' : 'Buy'}</td>
                      <td className="py-2 pr-4">{fmtAmount(s.tokenAmount)}</td>
                      <td className="py-2 pr-4">{fmtAmount(s.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Assets */}
        <section className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Assets</h2>
          {assets.length === 0 ? (
            <div className="text-sm text-gray-500">No assets configured.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Price (ETH)</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Current</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2 pr-4">Pool Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a: any, i: number) => (
                    <tr key={i} className="border-t dark:border-gray-700">
                      <td className="py-2 pr-4 font-mono">{tokenMeta[a.tokenAddress]?.symbol || a.tokenAddress}</td>
                      <td className="py-2 pr-4">{ethers.formatEther(a.price)}</td>
                      <td className="py-2 pr-4">{Number(a.targetWeight) / 100}%</td>
                      <td className="py-2 pr-4">{Number(a.currentWeight) / 100}%</td>
                      <td className="py-2 pr-4">{a.isActive ? 'Yes' : 'No'}</td>
                      <td className="py-2 pr-4">{a.poolFee != null ? a.poolFee : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Add Asset (Owner) */}
        <section className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Add Asset (Owner)</h2>
          {isOwner ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input className="rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                     placeholder="Token address" value={assetToken} onChange={(e)=>setAssetToken(e.target.value)} />
              <input className="rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                     placeholder="Chainlink price feed" value={assetFeed} onChange={(e)=>setAssetFeed(e.target.value)} />
              <input className="rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                     placeholder="Target bps (e.g., 5000)" type="number"
                     value={assetTargetBps} onChange={(e)=>setAssetTargetBps(Number(e.target.value))} />
              <input className="rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                     placeholder="Min bps" type="number"
                     value={assetMinBps} onChange={(e)=>setAssetMinBps(Number(e.target.value))} />
              <input className="rounded border px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                     placeholder="Max bps" type="number"
                     value={assetMaxBps} onChange={(e)=>setAssetMaxBps(Number(e.target.value))} />
              <div className="md:col-span-5">
                <button onClick={onAddAsset} disabled={!isConnected || loading || !assetToken || !assetFeed}
                        className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                  Add Asset
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Total target weights across active assets should sum to 10000 bps (100%).
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Owner-only configuration</div>
          )}
        </section>

        {/* Quick Add from Catalog (Owner) */}
        {isOwner && (
          <section className="border rounded-lg p-4 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Add from Catalog</h2>
            {catalog.length === 0 ? (
              <div className="text-sm text-gray-500">No catalog items found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {catalog.map((it: any) => (
                  <div key={it.symbol} className="border rounded p-3 dark:border-gray-700">
                    <div className="font-semibold">{it.symbol}</div>
                    <div className="text-xs text-gray-500 break-all">Token: {it.token}</div>
                    <div className="text-xs text-gray-500 break-all">Feed: {it.feed}</div>
                    <div className="text-xs text-gray-500">Default: {it.defaultTargetBps/100}% (min {it.defaultMinBps/100}% / max {it.defaultMaxBps/100}%)</div>
                    <button
                      onClick={() => addCatalogItem(it)}
                      disabled={!isConnected || loading || addingFromCatalog === it.symbol}
                      className="mt-2 inline-flex items-center px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {addingFromCatalog === it.symbol ? 'Adding...' : `Add ${it.symbol}`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-base font-medium text-gray-900 dark:text-white">{children}</div>
    </div>
  )
}
