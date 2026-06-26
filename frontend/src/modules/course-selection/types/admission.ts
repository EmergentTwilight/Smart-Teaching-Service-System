export interface AdmissionEnterPayload {
  semesterId?: string;
}

export interface AdmissionLeaseRequest {
  semesterId: string;
  leaseId: string;
}

export interface AdmissionLeasePayload {
  admitted: boolean;
  semesterId: string;
  leaseId: string;
  activeSessions: number;
  maxActiveSessions: number;
  idleTimeoutSeconds: number;
  heartbeatIntervalSeconds: number;
  expiresAt: string;
}

export interface AdmissionLeavePayload {
  released: boolean;
  semesterId: string;
}
