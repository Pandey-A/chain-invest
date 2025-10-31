import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import IndexFundList from '@/components/IndexFundList'
import CreateFundModal from '@/components/CreateFundModal'
import FundDetails from '@/components/FundDetails'

export default function Home() {
  const { address, isConnected } = useAccount()
  const [selectedFund, setSelectedFund] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <>
      <Head>
        <title>ChainIndex - Onchain Index Funds</title>
        <meta name="description" content="Create and invest in decentralized index funds on Ethereum" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Navbar 
          onCreateFund={() => setShowCreateModal(true)}
          isConnected={isConnected}
        />
        
        <main>
          {!selectedFund ? (
            <>
              <Hero 
                onCreateFund={() => setShowCreateModal(true)}
                isConnected={isConnected}
              />
              <IndexFundList 
                onSelectFund={setSelectedFund}
                userAddress={address}
              />
            </>
          ) : (
            <FundDetails 
              fundAddress={selectedFund}
              onBack={() => setSelectedFund(null)}
            />
          )}
        </main>

        {showCreateModal && (
          <CreateFundModal 
            onClose={() => setShowCreateModal(false)}
            isConnected={isConnected}
          />
        )}
      </div>
    </>
  )
}
