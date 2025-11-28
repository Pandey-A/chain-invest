import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react'

interface HeroProps {
  onCreateFund: () => void
  isConnected: boolean
}

export default function Hero({ onCreateFund, isConnected }: HeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            <span className="gradient-text">Onchain Index Funds</span>
            <br />
            <span className="text-gray-700 dark:text-gray-300">Made Simple</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
            Create, manage, and invest in decentralized index funds powered by smart contracts. 
            Diversify your crypto portfolio with automated rebalancing and transparent fee structures.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button 
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
              onClick={() => {
                // Scroll to funds section
                document.getElementById('funds-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <span>Explore Funds</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            
            {isConnected && (
              <button 
                className="border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105"
                onClick={onCreateFund}
              >
                Create Your Fund
              </button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="bg-primary-100 dark:bg-primary-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Automated Rebalancing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Smart contracts automatically rebalance your portfolio to maintain target allocations.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="bg-primary-100 dark:bg-primary-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Transparent & Secure
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All transactions are on-chain with transparent fee structures and auditable smart contracts.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="bg-primary-100 dark:bg-primary-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Low Fees
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Competitive management fees with no hidden costs or intermediaries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="relative bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">$2.1M+</div>
              <div className="text-gray-600 dark:text-gray-400">Total Value Locked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">15</div>
              <div className="text-gray-600 dark:text-gray-400">Active Funds</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">1,240</div>
              <div className="text-gray-600 dark:text-gray-400">Investors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">0.5%</div>
              <div className="text-gray-600 dark:text-gray-400">Average Fee</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
