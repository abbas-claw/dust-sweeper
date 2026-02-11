import { http, createConfig } from 'wagmi';
import { mainnet, base, arbitrum, optimism, polygon, bsc } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// HyperEVM chain definition (not in wagmi/chains yet)
const hyperEVM = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVM Explorer', url: 'https://hypurrscan.io' },
  },
} as const;

export const chains = [
  mainnet,
  base,
  arbitrum,
  optimism,
  hyperEVM,
  polygon,
  bsc,
] as const;

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [hyperEVM.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
  connectors: [
    injected(),
  ],
  ssr: true,
});
