export type InputType = 'url' | 'pdf' | 'ppt' | 'prompt';
export type VideoStatus = 'queued' | 'processing' | 'complete' | 'failed';
export type Plan = 'free' | 'starter' | 'pro' | 'agency';

export interface VideoJob {
  id: string;
  userId: string;
  title: string;
  inputType: InputType;
  inputData: { url?: string; text?: string; fileName?: string };
  status: VideoStatus;
  progress: number;
  currentStep?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  durationS?: number;
  errorMsg?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  credits: number;
  plan: Plan;
  stripeCustomerId?: string;
}

export const PLAN_CREDITS: Record<Plan, number> = {
  free: 1,
  starter: 5,
  pro: 20,
  agency: 60,
};

export const PLAN_PRICE: Record<Exclude<Plan, 'free'>, number> = {
  starter: 29,
  pro: 79,
  agency: 199,
};
