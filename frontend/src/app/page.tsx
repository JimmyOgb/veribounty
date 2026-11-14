'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import MetricsBar from '@/components/MetricsBar';
import BountyCard from '@/components/BountyCard';
import CreateBountyModal from '@/components/CreateBountyModal';
import SubmitDeliverableModal from '@/components/SubmitDeliverableModal';
import SubmissionsAuditDrawer from '@/components/SubmissionsAuditDrawer';
import { Bounty, ProtocolStats } from '@/types/bounty';
import { fetchAllBounties, fetchStats, CONTRACT_ADDRESS, EXPLORER_URL, CHAIN_ID } from '@/lib/genlayer';
import {
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'COMPLETED'>('ALL');

  // Wallet State
  const [account, setAccount] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBountyForPR, setSelectedBountyForPR] = useState<Bounty | null>(null);
  const [selectedBountyForAudit, setSelectedBountyForAudit] = useState<Bounty | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const [fetchedStats, fetchedBounties] = await Promise.all([
        fetchStats(),
        fetchAllBounties(),
      ]);
      setStats(fetchedStats);
      setBounties(fetchedBounties);
    } catch (err) {
      console.error('Error loading on-chain data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect Wallet Handler
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);

          // Check chainId
          const chainIdHex = await eth.request({ method: 'eth_chainId' });
          if (parseInt(chainIdHex, 16) !== CHAIN_ID) {
            try {
              await eth.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
              });
            } catch (switchError: any) {
              if (switchError.code === 4902) {
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
              }
            }
          }
        }
      } catch (err) {
        console.warn('Wallet connection error:', err);
      }
    } else {
      alert('No Ethereum wallet detected. Please install MetaMask or Rabby extension.');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  // Filtered Bounties
  const filteredBounties = bounties.filter((b) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'OPEN' && b.status === 'OPEN') ||
      (activeTab === 'COMPLETED' && b.status === 'COMPLETED');

    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.acceptance_criteria.toLowerCase().includes(search.toLowerCase()) ||
      b.creator.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      <Navbar
        onOpenCreate={() => setIsCreateOpen(true)}
        account={account}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-blue-950/40 via-slate-900/60 to-slate-950/90 p-8 sm:p-12 shadow-2xl backdrop-blur-md">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Autonomous Open-Source &amp; Task Escrow on GenLayer</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              AI-Adjudicated Bounties Settled by{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                Optimistic Democracy
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl">
              Lock funds into an escrow smart contract. When contributors submit pull requests or task deliverables, GenLayer validators fetch live diffs, independently evaluate them against natural-language criteria using LLM equivalence principles, and autonomously release payouts. Zero central gatekeepers.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                <span>Fund a Bounty</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
              >
                <span>Inspect Studionet Contract</span>
              </a>
            </div>
          </div>
        </div>

        {/* Real Metrics Bar */}
        <MetricsBar stats={stats} loading={loading} />

        {/* Board Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          {/* Tabs */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800 w-full sm:w-auto">
            {(['ALL', 'OPEN', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'ALL' ? 'All Bounties' : tab === 'OPEN' ? 'Open Escrow' : 'Completed'}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, criteria, address..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh On-Chain State"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bounty Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse p-5"
              />
            ))}
          </div>
        ) : filteredBounties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
            <GitPullRequest className="mx-auto h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Bounties Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search
                ? 'Try adjusting your search criteria'
                : 'Be the first to fund an open-source bounty on GenLayer!'}
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Create New Bounty
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBounties.map((bounty) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                onSubmitPR={(b) => setSelectedBountyForPR(b)}
                onViewAudit={(b) => setSelectedBountyForAudit(b)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/60 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
          <div className="flex items-center space-x-2">
            <span>VeriBounty</span>
            <span>•</span>
            <span>Powered by GenLayer Intelligent Contracts</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GenLayer Protocol
            </a>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Studionet Explorer
            </a>
            <a
              href="https://github.com/jimmyogb/veribounty"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateBountyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
        account={account}
        onConnectWallet={connectWallet}
      />

      <SubmitDeliverableModal
        bounty={selectedBountyForPR}
        isOpen={selectedBountyForPR !== null}
        onClose={() => setSelectedBountyForPR(null)}
        onSuccess={loadData}
        account={account}
        onConnectWallet={connectWallet}
      />

      <SubmissionsAuditDrawer
        bounty={selectedBountyForAudit}
        isOpen={selectedBountyForAudit !== null}
        onClose={() => setSelectedBountyForAudit(null)}
      />
    </div>
  );
}
