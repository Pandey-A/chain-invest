import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Plus, TrendingUp } from 'lucide-react'

interface NavbarProps {
  onCreateFund: () => void
  isConnected: boolean
}

export default function Navbar({ onCreateFund, isConnected }: NavbarProps) {
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-primary-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                ChainIndex
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Onchain Index Funds
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium">
                Explore Funds
              </a>
              <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium">
                Analytics
              </a>
              <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium">
                Documentation
              </a>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <button
                onClick={onCreateFund}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:block">Create Fund</span>
              </button>
            )}
            
            <ConnectButton
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
