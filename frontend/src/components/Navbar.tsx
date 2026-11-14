'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  PlusCircle,
  Network,
  AlertTriangle,
} from 'lucide-react';
import { CONTRACT_ADDRESS, EXPLORER_URL, CHAIN_ID, NETWORK_NAME } from '@/lib/genlayer';
import { formatAddress } from '@/lib/utils';

interface NavbarProps {
  onOpenCreate: () => void;
  account: string | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export default function Navbar({
  onOpenCreate,
  account,
  onConnectWallet,
  onDisconnectWallet,
}: NavbarProps) {
  const [copied, setCopied] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const checkNetwork = async () => {
        try {
          const currentChainId = await eth.request({ method: 'eth_chainId' });
          const parsed = parseInt(currentChainId, 16);
          setWrongNetwork(account !== null && parsed !== CHAIN_ID);
        } catch {
          // ignore
        }
      };
      checkNetwork();

      const handleChainChanged = () => {
        checkNetwork();
      };
      eth.on('chainChanged', handleChainChanged);
      return () => {
        eth.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchNetwork = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
      setWrongNetwork(false);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: 'GenLayer StudioNet',
                nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
                rpcUrls: ['https://studio.genlayer.com/api'],
                blockExplorerUrls: [EXPLORER_URL],
              },
            ],
          });
          setWrongNetwork(false);
        } catch {
          // error adding chain
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-2 shadow-lg shadow-blue-500/25">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">VeriBounty</span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                GenLayer AI Escrow
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI-Adjudicated Open-Source & Task Escrow on Optimistic Democracy
            </p>
          </div>
        </div>

        {/* Center / Network & Contract Pill */}
        <div className="hidden lg:flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium capitalize">{NETWORK_NAME}</span>
            <span className="text-slate-500">#{CHAIN_ID}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
            <span className="text-slate-500">Contract:</span>
            <span className="font-mono text-slate-200">{formatAddress(CONTRACT_ADDRESS)}</span>
            <button
              onClick={handleCopy}
              className="ml-1 text-slate-400 hover:text-white transition-colors"
              title="Copy Contract Address"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-blue-400 transition-colors"
              title="View on GenLayer Explorer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Right CTA / Wallet */}
        <div className="flex items-center space-x-3">
          {wrongNetwork && (
            <button
              onClick={switchNetwork}
              className="flex items-center space-x-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Switch to StudioNet</span>
            </button>
          )}

          <button
            onClick={onOpenCreate}
            className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-md shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="font-semibold">Fund New Bounty</span>
          </button>

          {account ? (
            <div className="flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-mono">{formatAddress(account)}</span>
              <button
                onClick={onDisconnectWallet}
                className="text-slate-500 hover:text-rose-400 ml-1 transition-colors"
                title="Disconnect"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Wallet className="h-4 w-4 text-blue-400" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
