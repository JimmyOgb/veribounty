import { createClient, chains } from 'genlayer-js';
import { TransactionStatus } from 'genlayer-js/types';
import { Bounty, ProtocolStats, Submission, TransactionProgress } from '../types/bounty';

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x4e7689f4CB926c60016E760cBBBF98578a093F52';
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';
export const NETWORK_NAME =
  process.env.NEXT_PUBLIC_GENLAYER_NETWORK || 'studionet';
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61999);
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://genlayer-explorer.vercel.app';
export const DEPLOYMENT_TX_HASH =
  process.env.NEXT_PUBLIC_DEPLOYMENT_TX_HASH || '0x5f0406557a94e4a8044e2a3d3e3f6e88a33eddd9c609a9a4f8b954927dd8ae6f';

// Read-only client for immediate unauthenticated browsing
export function getReadClient() {
  const chain = chains.studionet;
  return createClient({
    chain,
  });
}

// Fetch all live protocol metrics from contract get_stats()
export async function fetchStats(): Promise<ProtocolStats | null> {
  try {
    const client = getReadClient();
    const raw = (await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_stats',
      args: [],
    })) as Record<string, unknown>;

    if (!raw) return null;

    return {
      total_bounties: Number(raw.total_bounties || 0),
      open_bounties: Number(raw.open_bounties || 0),
      completed_bounties: Number(raw.completed_bounties || 0),
      cancelled_bounties: Number(raw.cancelled_bounties || 0),
      total_escrowed_amount: String(raw.total_escrowed_amount || '0'),
      total_paid_out_amount: String(raw.total_paid_out_amount || '0'),
      total_submissions: Number(raw.total_submissions || 0),
    };
  } catch (err) {
    console.warn('Failed to fetch protocol stats:', err);
    return null;
  }
}

// Fetch all bounties from contract get_all_bounties()
export async function fetchAllBounties(): Promise<Bounty[]> {
  try {
    const client = getReadClient();
    const raw = (await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_all_bounties',
      args: [],
    })) as Array<Record<string, unknown>>;

    if (!Array.isArray(raw)) return [];

    return raw.map((b) => ({
      id: Number(b.id),
      creator: String(b.creator),
      title: String(b.title),
      issue_url: String(b.issue_url || ''),
      acceptance_criteria: String(b.acceptance_criteria || ''),
      reward_amount: String(b.reward_amount || '0'),
      status: (b.status as any) || 'OPEN',
      winner: String(b.winner || ''),
      winning_submission_url: String(b.winning_submission_url || ''),
      last_verdict_reason: String(b.last_verdict_reason || ''),
      submission_count: Number(b.submission_count || 0),
    }));
  } catch (err) {
    console.warn('Failed to fetch all bounties:', err);
    return [];
  }
}

// Fetch submissions and AI rationales for a specific bounty
export async function fetchBountySubmissions(bountyId: number): Promise<Submission[]> {
  try {
    const client = getReadClient();
    const raw = (await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_bounty_submissions',
      args: [bountyId],
    })) as Array<Record<string, unknown>>;

    if (!Array.isArray(raw)) return [];

    return raw.map((s) => ({
      id: Number(s.id),
      bounty_id: Number(s.bounty_id),
      submitter: String(s.submitter),
      submission_url: String(s.submission_url),
      approved: Boolean(s.approved),
      reason: String(s.reason),
    }));
  } catch (err) {
    console.warn(`Failed to fetch submissions for bounty #${bountyId}:`, err);
    return [];
  }
}

// Monitor transaction until GenLayer validators reach consensus
export async function waitForConsensus(
  txHash: `0x${string}`,
  onProgress?: (progress: TransactionProgress) => void
) {
  const client = getReadClient();
  const startTime = Date.now();
  let finished = false;

  onProgress?.({
    stage: 'SUBMITTING',
    txHash,
    message: 'Transaction broadcast to GenLayer network. Waiting for validator leader...',
  });

  const pollInterval = setInterval(async () => {
    if (finished) return;
    try {
      const tx = (await client.getTransaction({ hash: txHash as any })) as any;
      if (!tx) return;

      const status = String(tx.status_name || tx.status || '').toUpperCase();
      const lifecycle = tx.lifecycle?.state || '';

      if (lifecycle === 'processing' || status.includes('PENDING')) {
        onProgress?.({
          stage: 'PROPOSING',
          txHash,
          message: 'Leader validator fetching deliverable diffs & executing Intelligent Contract audit...',
        });
      } else if (lifecycle === 'decided' || status.includes('COMMIT')) {
        onProgress?.({
          stage: 'COMMITTING',
          txHash,
          message: 'Independent validators executing Equivalence Principle consensus comparison...',
        });
      } else if (status === 'ACCEPTED' || status === 'FINALIZED' || lifecycle === 'finalized') {
        finished = true;
        clearInterval(pollInterval);
        onProgress?.({
          stage: 'FINALIZED',
          txHash,
          message: 'Consensus sealed! On-chain state transition & escrow updated.',
        });
      }
    } catch {
      // Ignore intermediate polling errors
    }
  }, 2500);

  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as any,
      status: TransactionStatus.ACCEPTED,
    });
    finished = true;
    clearInterval(pollInterval);
    onProgress?.({
      stage: 'FINALIZED',
      txHash,
      message: 'Consensus finalized! Intelligent contract updated.',
    });
    return receipt;
  } catch (err: any) {
    finished = true;
    clearInterval(pollInterval);
    onProgress?.({
      stage: 'ERROR',
      txHash,
      message: err?.message || 'Transaction consensus failed',
      error: err?.message || 'Transaction failed',
    });
    throw err;
  }
}
