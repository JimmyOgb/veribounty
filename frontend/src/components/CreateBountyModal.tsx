'use client';

import React, { useState } from 'react';
import { X, Sparkles, Coins, AlertCircle, GitPullRequest, FileText, CheckCircle2 } from 'lucide-react';
import { TransactionProgress } from '@/types/bounty';
import ConsensusTracker from './ConsensusTracker';
import { CONTRACT_ADDRESS, getReadClient, waitForConsensus, CHAIN_ID } from '@/lib/genlayer';
import { parseGenToWei } from '@/lib/utils';
import { createClient, createAccount, chains } from 'genlayer-js';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: string | null;
  onConnectWallet: () => void;
}

export default function CreateBountyModal({
  isOpen,
  onClose,
  onSuccess,
  account,
  onConnectWallet,
}: CreateBountyModalProps) {
  const [title, setTitle] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [criteria, setCriteria] = useState('');
  const [rewardAmount, setRewardAmount] = useState('1.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransactionProgress>({
    stage: 'IDLE',
    message: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    if (!criteria.trim()) {
      setError('Acceptance criteria cannot be empty');
      return;
    }
    const weiAmount = parseGenToWei(rewardAmount);
    if (weiAmount <= BigInt(0)) {
      setError('Reward amount must be greater than 0 GEN');
      return;
    }

    try {
      setLoading(true);
      setProgress({
        stage: 'SUBMITTING',
        message: 'Broadcasting payable create_bounty transaction to GenLayer Studionet...',
      });

      let txHash: `0x${string}`;

      // Check if browser wallet (window.ethereum) is available
      if (typeof window !== 'undefined' && (window as any).ethereum && account) {
        const eth = (window as any).ethereum;

        // Ensure connected to Studionet
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch {
          // ignore if already on network
        }

        const client = createClient({
          chain: chains.studionet,
          account: account as `0x${string}`,
        });

        txHash = (await client.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'create_bounty',
          args: [title.trim(), issueUrl.trim(), criteria.trim()],
          value: weiAmount,
        })) as `0x${string}`;
      } else {
        // Fallback for demo or dev environment: call via readClient or prompt user to connect
        if (!account) {
          setError('Please connect your browser wallet to fund and post a bounty.');
          setLoading(false);
          setProgress({ stage: 'IDLE', message: '' });
          return;
        }
        throw new Error('No Ethereum provider detected. Please install MetaMask or Rabby.');
      }

      // Wait for consensus finalization
      await waitForConsensus(txHash, setProgress);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error creating bounty:', err);
      setError(err?.message || 'Failed to submit transaction');
      setProgress({
        stage: 'ERROR',
        message: err?.message || 'Transaction reverted',
        error: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fund New Open-Source Bounty</h2>
              <p className="text-xs text-slate-400">
                Lock native GEN reward into GenLayer Intelligent Contract Escrow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Bounty Title *
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement EIP-712 Typed Data Signatures"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                GitHub Issue / Spec URL
              </label>
              <div className="relative mt-1.5">
                <GitPullRequest className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="url"
                  disabled={loading}
                  value={issueUrl}
                  onChange={(e) => setIssueUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/issues/123"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Escrow Reward Amount (GEN) *
              </label>
              <div className="relative mt-1.5">
                <Coins className="absolute left-3 top-2.5 h-4 w-4 text-amber-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  disabled={loading}
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  placeholder="1.0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Natural-Language Acceptance Criteria *
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              GenLayer validators independently read this specification to adjudicate submitted code diffs.
            </p>
            <textarea
              required
              rows={4}
              disabled={loading}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="e.g. Must implement EIP-712 hashing routines, pass all unit test suites, avoid placeholder stubs, and properly handle BigInt chain IDs."
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
            />
          </div>

          {progress.stage !== 'IDLE' && <ConsensusTracker progress={progress} />}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            {!account ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <span>Connect Wallet to Fund</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
              >
                <span>Lock Escrow &amp; Post Bounty</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
