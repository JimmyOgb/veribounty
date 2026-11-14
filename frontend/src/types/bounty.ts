export interface Bounty {
  id: number;
  creator: string;
  title: string;
  issue_url: string;
  acceptance_criteria: string;
  reward_amount: string; // in wei
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  winner: string;
  winning_submission_url: string;
  last_verdict_reason: string;
  submission_count: number;
}

export interface Submission {
  id: number;
  bounty_id: number;
  submitter: string;
  submission_url: string;
  approved: boolean;
  reason: string;
}

export interface ProtocolStats {
  total_bounties: number;
  open_bounties: number;
  completed_bounties: number;
  cancelled_bounties: number;
  total_escrowed_amount: string;
  total_paid_out_amount: string;
  total_submissions: number;
}

export interface TransactionProgress {
  stage: 'IDLE' | 'SUBMITTING' | 'PROPOSING' | 'COMMITTING' | 'REVEALING' | 'FINALIZED' | 'ERROR';
  txHash?: string;
  message: string;
  error?: string;
}
