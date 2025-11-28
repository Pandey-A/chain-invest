import { useState } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

interface CreateFundModalProps {
  onClose: () => void
  isConnected: boolean
}

export default function CreateFundModal({ onClose, isConnected }: CreateFundModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    managementFee: '200', // 2%
    performanceFee: '1000', // 10%
  })
  
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsCreating(true)
    
    try {
      const FACTORY = process.env.NEXT_PUBLIC_FACTORY_ADDRESS
      if (!FACTORY) throw new Error('Factory address not configured')

      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No wallet provider found')
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const factoryAbi = [
        { inputs: [], name: 'creationFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
        { inputs: [
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'symbol', type: 'string' },
            { internalType: 'uint256', name: 'managementFee', type: 'uint256' },
            { internalType: 'uint256', name: 'performanceFee', type: 'uint256' }
          ], name: 'createIndexFund', outputs: [{ internalType: 'address', name: 'fundAddress', type: 'address' }], stateMutability: 'payable', type: 'function' }
      ] as const

      const factory = new ethers.Contract(FACTORY, factoryAbi as any, signer)
      const creationFee: bigint = await factory.creationFee()

      const mgmt = parseInt(formData.managementFee || '0', 10)
      const perf = parseInt(formData.performanceFee || '0', 10)
      if (Number.isNaN(mgmt) || Number.isNaN(perf)) throw new Error('Invalid fee inputs')

      const tx = await factory.createIndexFund(
        formData.name.trim(),
        formData.symbol.trim(),
        BigInt(mgmt),
        BigInt(perf),
        { value: creationFee }
      )
      const receipt = await tx.wait()

      // Best-effort extraction of created fund address from return value or events
      // ethers v6 returns the function result when using .wait() with interface decode, but we keep it simple here
      console.log('Create fund tx mined:', receipt?.hash)
      toast.success('Fund created successfully! It may take a moment to appear in the list.')
      onClose()
    } catch (error) {
      console.error('Error creating fund:', error)
      toast.error('Failed to create fund. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Index Fund
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fund Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Crypto Top 10 Index"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                required
                placeholder="e.g., CT10"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Management Fee (basis points)
              </label>
              <input
                type="number"
                name="managementFee"
                value={formData.managementFee}
                onChange={handleChange}
                required
                min="0"
                max="1000"
                placeholder="200 (2%)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Annual management fee in basis points (100 = 1%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Performance Fee (basis points)
              </label>
              <input
                type="number"
                name="performanceFee"
                value={formData.performanceFee}
                onChange={handleChange}
                required
                min="0"
                max="3000"
                placeholder="1000 (10%)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Performance fee in basis points (1000 = 10%)
              </p>
            </div>

            {/* Creation Fee Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Creation Fee
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                A one-time fee of <strong>0.01 ETH</strong> is required to create a new index fund.
                This helps prevent spam and covers deployment costs.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !isConnected}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isCreating ? (
                  <>
                    <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Fund'
                )}
              </button>
            </div>
          </form>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Disclaimer:</strong> Creating an index fund involves smart contract deployment. 
              Make sure you understand the risks and have sufficient funds for transaction fees. 
              You will be responsible for managing the fund and its assets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
