# Dust Sweeper Project Memory

## Project Overview
Multi-chain dust token sweeper using Relay.link API.
- **Goal:** Find small token balances (<$50) across EVM chains and swap them to native gas tokens.
- **Stack:** Next.js 15, Wagmi v2, Viem, TailwindCSS.
- **API:** Relay.link (`https://api.relay.link`) for token discovery and swaps.

## Architecture
- **Token Discovery:** `POST /currencies/v2` (Relay) + Multicall3 `balanceOf` (on-chain).
- **Pricing:** Relay price API (`/currencies/token/price`).
- **Swaps:** Relay Quote API (`/quote`) + local transaction execution.
- **Wallet:** Wagmi `injected` connector (MetaMask/Browser Wallet) — **No WalletConnect/RainbowKit**.

## Key Files
- `lib/wagmi.ts`: Wagmi config with 7 chains (Eth, Base, Arb, Opt, Poly, BSC, HyperEVM).
- `lib/relay.ts`: Relay API client (fetch wrapper).
- `lib/tokens.ts`: Discovery logic (multicall + price fetching).
- `app/page.tsx`: Main UI with Connect button and Scanner.
- `app/components/sweep-panel.tsx`: Sweep execution logic.

## Progress
- [x] Phase 1: Scaffold & Config (Wagmi + Injected)
- [x] Phase 2: Token Discovery Logic
- [x] Phase 3: Token List UI
- [x] Phase 4: Sweep Logic (Quote + Tx)
- [x] Phase 5: Sweep UI
- [x] Phase 6: Security & Polish
- [x] Phase 7: Deployment Ready (Build Passing)

## Recent Changes
- Removed RainbowKit & WalletConnect dependency.
- Switched to pure Wagmi `injected()` connector for wallet connection.
- Custom Connect Wallet button implementation.

## Next Steps
- Init git repo and push to Vercel.
- Live testing with real wallet.
