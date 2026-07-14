export type Job = {
  id: string;
  name: string;
  customer?: string;
  address?: string;
  serviceType?: string;
  notes?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  beforeCount: number;
  progressCount: number;
  afterCount: number;
};

export type JobInput = {
  name: string;
  customer?: string;
  address?: string;
  serviceType?: string;
  notes?: string;
};

export type JobUpdateInput = Partial<JobInput>;
