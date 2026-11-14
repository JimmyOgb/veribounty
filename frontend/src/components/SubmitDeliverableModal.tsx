'use client';

import React, { useState } from 'react';
import { Bounty, TransactionProgress } from '@/types/bounty';
import {
  X,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Coins,
  Bot,
  HelpCircle,
} from 'lucide-react';
import ConsensusTracker from './ConsensusTracker';
import { CONTRACT_ADDRESS, waitForConsensus, CHAIN_ID } from '@/lib/genlayer';
import { formatGen } from '@/lib/utils';
import { createClient, chains } from 'genlayer-js';

interface SubmitDeliverableModalProps {
  bounty: Bounty | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: string | null;
  onConnectWallet: () => void;
}

export default function SubmitDeliverableModal({
  bounty,
  isOpen,
  onClose,
  onSuccess,
  account,
  onConnectWallet,
}: SubmitDeliverableModalProps) {
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdictResult, setVerdictResult] = useState<{
    approved: boolean;
    reason: string;
  } | null>(null);
  const [progress, setProgress] = useState<TransactionProgress>({
    stage: 'IDLE',
    message: '',
  });

  if (!isOpen || !bounty) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerdictResult(null);

    const url = submissionUrl.trim();
    if (!url.startsWith('https://')) {
      setError('Deliverable URL must start with https://');
      return;
    }

    try {
      setLoading(true);
      setProgress({
        stage: 'SUBMITTING',
        message: 'Broadcasting deliverable to GenLayer Studionet validators...',
      });

      if (!account || typeof window === 'undefined' || !(window as any).ethereum) {
        setError('Please connect your browser wallet to sign the verification transaction.');
        setLoading(false);
        setProgress({ stage: 'IDLE', message: '' });
        return;
      }

      const eth = (window as any).ethereum;
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
      } catch {
        // ignore
      }

      const client = createClient({
        chain: chains.studionet,
        account: account as `0x${string}`,
      });

      const txHash = (await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submit_and_verify',
        args: [bounty.id, url],
        value: 0n,
      })) as `0x${string}`;

      // Wait for consensus finalization
      const receipt = await waitForConsensus(txHash, setProgress);

      // Attempt to read execution receipt result
      try {
        if (receipt && (receipt as any).execution_result) {
          const parsed = JSON.parse((receipt as any).execution_result);
          setVerdictResult(parsed);
        }
      } catch {
        // ignore parsing
      }

      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting deliverable:', err);
      setError(err?.message || 'Verification transaction failed');
      setProgress({
        stage: 'ERROR',
        message: err?.message || 'Transaction error',
        error: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Submit PR for AI Adjudication</h2>
              <p className="text-xs text-slate-400">
                Bounty #{bounty.id}: {bounty.title}
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

        {/* Bounty Overview Box */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Escrow Reward
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatGen(bounty.reward_amount)} GEN
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Required Acceptance Criteria
            </span>
            <p className="mt-1 text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              {bounty.acceptance_criteria}
            </p>
          </div>

          {bounty.issue_url && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span className="text-slate-500">Spec Reference:</span>
              <a
                href={bounty.issue_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span className="truncate max-w-sm">{bounty.issue_url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              GitHub PR URL or Live Deliverable URL *
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              GenLayer validators will fetch the PR page and `.diff`, inspect the implementation, and run LLM equivalence consensus.
            </p>
            <div className="relative mt-2">
              <GitPullRequest className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="url"
                required
                disabled={loading}
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-3 text-xs text-blue-300 flex items-start space-x-2">
            <Bot className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>How GenLayer Adjudication Works:</strong> Each validator fetches the deliverable independently via <code className="text-blue-200">gl.nondet.web</code>, audits code diffs against natural-language criteria with senior auditor AI prompts, and reaches cryptographic consensus via the Equivalence Principle. If approved, the escrowed GEN prize transfers immediately to your wallet.
            </div>
          </div>

          {progress.stage !== 'IDLE' && <ConsensusTracker progress={progress} />}

          {/* Verdict Banner */}
          {verdictResult && (
            <div
              className={`rounded-xl border p-4 text-xs ${
                verdictResult.approved
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm">
                {verdictResult.approved ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span>APPROVED — Reward Transferred!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                    <span>REJECTED by Validator Consensus</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-slate-200 leading-relaxed font-sans">
                {verdictResult.reason}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>

            {!account ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <span>Connect Wallet to Submit</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
              >
                <span>Execute AI Audit &amp; Claim Escrow</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
