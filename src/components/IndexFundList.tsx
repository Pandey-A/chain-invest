import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

interface IndexFund {
  id: number
  name: string
  symbol: string
  address: string
  creator: string
  totalValue: string
  managementFee: number
  performanceFee: number
  isActive: boolean
}

interface IndexFundListProps {
  onSelectFund: (address: string) => void
  userAddress?: string
}

export default function IndexFundList({ onSelectFund, userAddress }: IndexFundListProps) {
  const [funds, setFunds] = useState<IndexFund[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const FACTORY = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || ''

  const factoryAbi = [
    { inputs: [], name: 'fundCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ internalType: 'uint256', name: 'startIndex', type: 'uint256' }, { internalType: 'uint256', name: 'limit', type: 'uint256' }], name: 'getActiveFunds', outputs: [{
      components: [
        { internalType: 'address', name: 'fundAddress', type: 'address' },
        { internalType: 'string', name: 'name', type: 'string' },
        { internalType: 'string', name: 'symbol', type: 'string' },
        { internalType: 'address', name: 'creator', type: 'address' },
        { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        { internalType: 'bool', name: 'isActive', type: 'bool' }
      ], internalType: 'struct ChainIndexFactory.IndexFundInfo[]', name: 'funds', type: 'tuple[]'
    }], stateMutability: 'view', type: 'function' },
  ] as const

  const fundAbi = [
    { inputs: [], name: 'managementFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'performanceFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  ] as const

  useEffect(() => {
    let cancelled = false
    async function fetchFunds() {
      try {
        setLoading(true)
        if (!FACTORY) {
          setFunds([])
          setLoading(false)
          return
        }
        let provider: ethers.Provider
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          provider = new ethers.BrowserProvider((window as any).ethereum)
        } else {
          // fallback to public provider (sepolia by default)
          const infuraId = process.env.NEXT_PUBLIC_INFURA_ID
          provider = ethers.getDefaultProvider('sepolia', { infura: infuraId ? { apiKey: infuraId } : undefined })
        }
        // If BrowserProvider, need .unwrap for read-only signer? We can use a Contract with provider directly
        const signerOrProvider: any = provider
        const factory = new ethers.Contract(FACTORY, factoryAbi as any, signerOrProvider)
        const count: bigint = await factory.fundCount()
        if (count === 0n) {
          if (!cancelled) setFunds([])
          setLoading(false)
          return
        }
        const limit = count > 50n ? 50n : count
        const active = await factory.getActiveFunds(0n, limit)
        // active is an array of structs
        const items = Array.from(active as any[])

        // Fetch fees for each fund (best-effort)
        const enriched = await Promise.all(items.map(async (it: any, idx: number) => {
          const addr = it.fundAddress || it[0]
          let mgmt = 0, perf = 0
          try {
            const fund = new ethers.Contract(addr, fundAbi as any, signerOrProvider)
            const [m, p] = await Promise.all([fund.managementFee(), fund.performanceFee()])
            mgmt = Number(m)
            perf = Number(p)
          } catch {}
          const entry: IndexFund = {
            id: idx,
            name: it.name || it[1],
            symbol: it.symbol || it[2],
            address: addr,
            creator: it.creator || it[3],
            totalValue: '0',
            managementFee: mgmt,
            performanceFee: perf,
            isActive: it.isActive ?? true,
          }
          return entry
        }))
        if (!cancelled) setFunds(enriched)
      } catch (e) {
        console.error('Failed to fetch funds', e)
        if (!cancelled) {
          setFunds([])
          toast.error('Failed to load funds. Please refresh the page.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchFunds()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [FACTORY])

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`
    }
    return `$${num.toFixed(0)}`
  }

  const formatFee = (fee: number) => {
    return `${fee / 100}%`
  }

  if (loading) {
    return (
      <div id="funds-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="loading-spinner inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600">Loading funds...</p>
        </div>
      </div>
    )
  }

  return (
    <div id="funds-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Explore Index Funds
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Discover and invest in professionally managed index funds or create your own.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {['all', 'defi', 'layer1', 'top-cap'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              selectedCategory === category
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category === 'top-cap' ? 'Top Cap' : category}
          </button>
        ))}
      </div>

      {/* Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map((fund) => (
          <div
            key={fund.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => onSelectFund(fund.address)}
          >
            <div className="p-6">
              {/* Fund Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {fund.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {fund.symbol}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                  Active
                </div>
              </div>

              {/* Fund Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Value</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(fund.totalValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Management Fee</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatFee(fund.managementFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Performance Fee</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatFee(fund.performanceFee)}
                  </span>
                </div>
              </div>

              {/* Fund Address */}
              <div className="mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Contract: {fund.address}
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectFund(fund.address)
                }}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {funds.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Funds Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Be the first to create an index fund!
          </p>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium">
            Create Fund
          </button>
        </div>
      )}
    </div>
  )
}
