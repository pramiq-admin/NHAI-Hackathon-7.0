import {apiFetch} from './httpClient';
import type {AdminProfile, WorkerProfile} from '../app/auth/sessionStore';

export type AdminTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  admin: AdminProfile;
};

export type WorkerTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  worker: WorkerProfile;
};

export type WorkerOut = {
  id: string;
  name: string;
  aadhar_masked: string;
  admin_id: string;
  active: boolean;
  created_at: string;
};

export async function adminSignup(payload: {
  name: string;
  mobile: string;
  aadhar: string;
  face_template_id?: string | null;
}): Promise<AdminTokenResponse> {
  return apiFetch('/api/v1/admin/signup', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export async function adminLogin(payload: {
  mobile: string;
  aadhar: string;
  face_template_id?: string | null;
}): Promise<AdminTokenResponse> {
  return apiFetch('/api/v1/admin/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export async function adminMe(): Promise<AdminProfile> {
  return apiFetch('/api/v1/admin/me');
}

export async function workerLogin(payload: {
  name: string;
  aadhar: string;
}): Promise<WorkerTokenResponse> {
  return apiFetch('/api/v1/worker/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export async function createWorker(payload: {
  name: string;
  aadhar: string;
  face_template_id?: string | null;
}): Promise<WorkerOut> {
  return apiFetch('/api/v1/workers', {
    method: 'POST',
    body: payload,
  });
}

export async function listWorkers(): Promise<WorkerOut[]> {
  return apiFetch('/api/v1/workers');
}

export async function deleteWorker(workerId: string): Promise<{ok: boolean}> {
  return apiFetch(`/api/v1/workers/${workerId}`, {method: 'DELETE'});
}
