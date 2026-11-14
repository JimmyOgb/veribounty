'use client';

import React from 'react';
import { TransactionProgress } from '@/types/bounty';
import { Loader2, CheckCircle2, AlertCircle, Cpu, Globe, Users, Coins } from 'lucide-react';
import { EXPLORER_URL } from '@/lib/genlayer';

interface ConsensusTrackerProps {
  progress: TransactionProgress;
}

export default function ConsensusTracker({ progress }: ConsensusTrackerProps) {
  if (progress.stage === 'IDLE') return null;

  const steps = [
    {
      id: 'SUBMITTING',
      label: 'Broadcast to Studionet',
      desc: 'Mempool submission & signature verification',
      icon: Cpu,
    },
    {
      id: 'PROPOSING',
      label: 'Leader AI & Web Fetch',
      desc: 'Fetching PR diffs & executing senior code audit',
      icon: Globe,
    },
    {
      id: 'COMMITTING',
      label: 'Optimistic Democracy',
      desc: 'Independent validator consensus via Equivalence Principle',
      icon: Users,
    },
    {
      id: 'FINALIZED',
      label: 'On-Chain Settlement',
      desc: 'Smart contract storage write & escrow payout sealed',
      icon: Coins,
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (progress.stage === 'ERROR') return 'error';
    if (progress.stage === 'FINALIZED') return 'completed';

    const order = ['SUBMITTING', 'PROPOSING', 'COMMITTING', 'REVEALING', 'FINALIZED'];
    const currentIndex = order.indexOf(progress.stage);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          {progress.stage === 'FINALIZED' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : progress.stage === 'ERROR' ? (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          ) : (
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          )}
          <span className="font-semibold text-sm text-slate-100">
            {progress.stage === 'FINALIZED'
              ? 'Consensus Finalized'
              : progress.stage === 'ERROR'
              ? 'Consensus Failed'
              : 'GenLayer Consensus in Progress'}
          </span>
        </div>
        {progress.txHash && (
          <a
            href={`${EXPLORER_URL}/tx/${progress.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-blue-400 hover:underline"
          >
            {progress.txHash.slice(0, 10)}...{progress.txHash.slice(-8)}
          </a>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-300 font-medium">{progress.message}</p>
      {progress.error && <p className="mt-1 text-xs text-rose-400 font-mono">{progress.error}</p>}

      {/* Steps visualization */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                status === 'completed'
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300'
                  : status === 'active'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-200 ring-1 ring-blue-400/50'
                  : status === 'error'
                  ? 'border-rose-500/30 bg-rose-500/5 text-slate-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                {status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : status === 'active' ? (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-xs font-bold">{step.label}</span>
              </div>
              <span className="text-[10px] mt-1 leading-tight text-slate-400">{step.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
