'use client';

import React from 'react';
import { Bounty } from '@/types/bounty';
import { formatAddress, formatGen } from '@/lib/utils';
import {
  ExternalLink,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Trophy,
  History,
  FileText,
} from 'lucide-react';

interface BountyCardProps {
  bounty: Bounty;
  onSubmitPR: (bounty: Bounty) => void;
  onViewAudit: (bounty: Bounty) => void;
}

export default function BountyCard({ bounty, onSubmitPR, onViewAudit }: BountyCardProps) {
  const isCompleted = bounty.status === 'COMPLETED';
  const isOpen = bounty.status === 'OPEN';
  const isCancelled = bounty.status === 'CANCELLED';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/80 shadow-md">
      <div>
        {/* Header: ID, Status, Prize */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-semibold text-slate-500">#{bounty.id}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                isOpen
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : isCompleted
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              {bounty.status}
            </span>
            {bounty.submission_count > 0 && (
              <span className="flex items-center space-x-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                <History className="h-3 w-3" />
                <span>{bounty.submission_count} audited</span>
              </span>
            )}
          </div>

          <div className="text-right">
            <div className="rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 px-3 py-1 text-right">
              <span className="text-base font-extrabold text-white tracking-tight">
                {formatGen(bounty.reward_amount)}
              </span>
              <span className="ml-1 text-xs font-bold text-blue-400">GEN</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-base font-semibold text-white leading-snug hover:text-blue-300 transition-colors">
          {bounty.title}
        </h3>

        {/* Issue Link */}
        {bounty.issue_url && (
          <div className="mt-2">
            <a
              href={bounty.issue_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-blue-400 font-mono transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate max-w-[280px]">{bounty.issue_url}</span>
            </a>
          </div>
        )}

        {/* Acceptance Criteria */}
        <div className="mt-4 rounded-lg bg-slate-950/60 border border-slate-800/80 p-3">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            <span>Acceptance Criteria</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-300 line-clamp-3 whitespace-pre-line leading-relaxed font-sans">
            {bounty.acceptance_criteria}
          </p>
        </div>

        {/* Winner or Latest AI Verdict */}
        {isCompleted && (
          <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-950/20 p-2.5 text-xs">
            <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>Paid Out to:</span>
              <span className="font-mono text-slate-200">{formatAddress(bounty.winner)}</span>
            </div>
            {bounty.winning_submission_url && (
              <a
                href={bounty.winning_submission_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center space-x-1 text-[11px] text-blue-300 hover:underline truncate"
              >
                <GitPullRequest className="h-3 w-3 shrink-0" />
                <span className="truncate">{bounty.winning_submission_url}</span>
              </a>
            )}
          </div>
        )}

        {!isCompleted && bounty.last_verdict_reason && (
          <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-950/20 p-2.5 text-xs">
            <div className="flex items-center space-x-1 text-purple-300 font-semibold text-[11px]">
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Latest AI Validator Rationale:</span>
            </div>
            <p className="mt-1 text-slate-300 line-clamp-2 italic">
              &quot;{bounty.last_verdict_reason}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
        <div className="text-slate-500">
          By <span className="font-mono text-slate-400">{formatAddress(bounty.creator)}</span>
        </div>

        <div className="flex items-center space-x-2">
          {bounty.submission_count > 0 && (
            <button
              onClick={() => onViewAudit(bounty)}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <History className="h-3.5 w-3.5 text-slate-400" />
              <span>Audit Trail</span>
            </button>
          )}

          {isOpen ? (
            <button
              onClick={() => onSubmitPR(bounty)}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>Submit PR</span>
            </button>
          ) : (
            <span className="text-slate-500 text-[11px] font-medium py-1">Closed</span>
          )}
        </div>
      </div>
    </div>
  );
}
