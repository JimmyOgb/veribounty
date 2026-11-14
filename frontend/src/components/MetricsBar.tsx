'use client';

import React from 'react';
import { ProtocolStats } from '@/types/bounty';
import { formatGen } from '@/lib/utils';
import { Coins, CheckCircle2, FileCode2, Scale, Flame } from 'lucide-react';

interface MetricsBarProps {
  stats: ProtocolStats | null;
  loading: boolean;
}

export default function MetricsBar({ stats, loading }: MetricsBarProps) {
  const cards = [
    {
      title: 'Total Bounties',
      value: loading ? '...' : stats?.total_bounties ?? 0,
      sub: `${stats?.open_bounties ?? 0} Open for Claims`,
      icon: Flame,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Active Escrow Pool',
      value: loading ? '...' : `${formatGen(stats?.total_escrowed_amount ?? '0')} GEN`,
      sub: 'Guaranteed by GenLayer Intelligent Escrow',
      icon: Coins,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Completed Payouts',
      value: loading ? '...' : `${formatGen(stats?.total_paid_out_amount ?? '0')} GEN`,
      sub: `${stats?.completed_bounties ?? 0} Bounties Settled`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'AI Verification Attempts',
      value: loading ? '...' : stats?.total_submissions ?? 0,
      sub: 'Code Diffs & PRs Audited',
      icon: FileCode2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Consensus Architecture',
      value: 'Optimistic Democracy',
      sub: 'Equivalence Principle Validation',
      icon: Scale,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`rounded-xl border ${card.bg} p-4 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/60`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-bold tracking-tight text-white">{card.value}</div>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
