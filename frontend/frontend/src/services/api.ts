// API Client Service
// HTTP client for backend API calls with authentication
// Based on specs/001-idea-spec-workflow/contracts/api.md

import { getToken } from './auth';

// API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiError {
  error: string;
  message: string;
  rollbackPerformed?: boolean;
}

export interface IdeaListItem {
  id: string;
  title: string;
  author: {
    id: string;
    email: string;
  };
  status: 'draft' | 'published' | 'archived';
  summary: string;
  tags: string[];
  createdAt: string;
  publishedAt: string | null;
}

export interface IdeaDetail {
  id: string;
  title: string;
  author: {
    id: string;
    email: string;
  };
  status: 'draft' | 'published' | 'archived';
  metadata: {
    summary: string;
    goals: string;
    requirements: string;
    tags: string[];
  };
  artifacts: {
    id: string;
    filePath: string;
    fileType: string;
    contentType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
  gitPath: string;
  gitCommitSha: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IdeaListResponse {
  ideas: IdeaListItem[];
  pagination: PaginationMeta;
}

export interface IdeaFilters {
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  dateFrom?: string; // ISO 8601
  dateTo?: string; // ISO 8601
  search?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Base fetch wrapper with authentication
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    // Token is invalid, clear it
    localStorage.removeItem('auth_token');
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return response;
}

/**
 * Handle API error responses
 */
async function handleApiError(response: Response): Promise<never> {
  let errorData: ApiError;

  try {
    errorData = await response.json();
  } catch {
    errorData = {
      error: 'Unknown Error',
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  throw new Error(errorData.message || 'An unknown error occurred');
}

/**
 * List ideas with pagination and filters
 */
export async function listIdeas(
  filters: IdeaFilters = {},
  pagination: PaginationParams = {}
): Promise<IdeaListResponse> {
  const params = new URLSearchParams();

  // Add pagination params
  if (pagination.page) {
    params.append('page', pagination.page.toString());
  }
  if (pagination.pageSize) {
    params.append('pageSize', pagination.pageSize.toString());
  }

  // Add filter params
  if (filters.author) {
    params.append('author', filters.author);
  }
  if (filters.status) {
    params.append('status', filters.status);
  }
  if (filters.tags && filters.tags.length > 0) {
    params.append('tags', filters.tags.join(','));
  }
  if (filters.dateFrom) {
    params.append('dateFrom', filters.dateFrom);
  }
  if (filters.dateTo) {
    params.append('dateTo', filters.dateTo);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }

  const url = `${API_BASE_URL}/ideas?${params.toString()}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Get detailed information for a single idea
 */
export async function getIdea(id: string): Promise<IdeaDetail> {
  const url = `${API_BASE_URL}/ideas/${id}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Publish a new idea
 */
export async function publishIdea(data: {
  title: string;
  specification: string;
  artifacts?: {
    filePath: string;
    content: string; // Base64 encoded
    contentType?: string;
  }[];
  tags?: string[];
  metadata?: Record<string, any>;
}): Promise<{
  id: string;
  title: string;
  gitPath: string;
  gitCommitSha: string;
  status: string;
  createdAt: string;
  publishedAt: string;
}> {
  const url = `${API_BASE_URL}/ideas`;
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Login and get authentication token
 */
export async function login(
  email: string,
  password: string
): Promise<{
  token: string;
  expiresAt: string;
}> {
  const url = `${API_BASE_URL}/auth/login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();

  // Store token in localStorage
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_expires_at', data.expiresAt);

  return data;
}

/**
 * Refresh authentication token
 */
export async function refreshToken(
  currentToken: string
): Promise<{
  token: string;
  expiresAt: string;
}> {
  const url = `${API_BASE_URL}/auth/refresh`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: currentToken }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();

  // Update stored token
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_expires_at', data.expiresAt);

  return data;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'healthy' | 'unhealthy';
    git: 'healthy' | 'unhealthy';
    templateSync: 'healthy' | 'unhealthy';
  };
  timestamp: string;
}> {
  const url = `${API_BASE_URL}/health`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}
