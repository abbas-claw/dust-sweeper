'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { TokenScanner } from './components/token-scanner';

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/70">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const injected = connectors.find((c) => c.type === 'injected');
        if (injected) {
          connect({ connector: injected });
        } else {
          // Fallback if no specific injected connector found (shouldn't happen with our config)
          const first = connectors[0];
          if (first) connect({ connector: first });
        }
      }}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
    >
      Connect Wallet
    </button>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">Dust Sweeper</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/50">multi-chain</span>
        </div>
        <WalletButton />
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {!isConnected ? (
          <div className="text-center py-24">
            <h1 className="text-4xl font-bold mb-4">Sweep Your Dust</h1>
            <p className="text-lg text-white/60 mb-8 max-w-md mx-auto">
              Connect your wallet to find small token balances across chains and convert them to ETH.
            </p>
            <button
              onClick={() => {
                const injected = connectors.find((c) => c.type === 'injected');
                if (injected) connect({ connector: injected });
              }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-lg rounded-xl font-semibold transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <TokenScanner address={address!} />
        )}
      </main>
    </div>
  );
}
