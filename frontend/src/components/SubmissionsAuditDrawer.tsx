'use client';

import React, { useState, useEffect } from 'react';
import { Bounty, Submission } from '@/types/bounty';
import { fetchBountySubmissions } from '@/lib/genlayer';
import { formatAddress } from '@/lib/utils';
import {
  X,
  History,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface SubmissionsAuditDrawerProps {
  bounty: Bounty | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmissionsAuditDrawer({
  bounty,
  isOpen,
  onClose,
}: SubmissionsAuditDrawerProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bounty) {
      setLoading(true);
      fetchBountySubmissions(bounty.id)
        .then((subs) => setSubmissions(subs))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, bounty]);

  if (!isOpen || !bounty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Adjudication Audit Trail</h2>
              <p className="text-xs text-slate-400">
                Bounty #{bounty.id}: {bounty.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              <span className="mt-2 text-xs">Loading on-chain audit trail...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
              No submissions recorded yet for this bounty.
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className={`rounded-xl border p-4 text-xs transition-all ${
                  sub.approved
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-slate-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        sub.approved
                          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                          : 'border-rose-500/40 bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {sub.approved ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>APPROVED</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>REJECTED</span>
                        </>
                      )}
                    </span>
                    <span className="font-mono text-slate-400">
                      by {formatAddress(sub.submitter)}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-slate-500">
                    Submission #{sub.id}
                  </span>
                </div>

                {/* Submission URL */}
                <div className="mt-2.5">
                  <a
                    href={sub.submission_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 font-mono text-blue-400 hover:underline"
                  >
                    <GitPullRequest className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-lg">{sub.submission_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                {/* AI Rationale */}
                <div className="mt-3 rounded-lg bg-slate-900/80 border border-slate-800/80 p-3">
                  <div className="flex items-center space-x-1 text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    <span>GenLayer Consensus Rationale:</span>
                  </div>
                  <p className="mt-1 text-slate-300 italic leading-relaxed font-sans">
                    &quot;{sub.reason}&quot;
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
