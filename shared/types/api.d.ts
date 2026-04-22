export type UserRole = 'user' | 'administrator';
export interface LoginRequest {
    email: string;
    password: string;
}
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
    };
    expiresAt: string;
}
export interface RefreshTokenRequest {
    token: string;
}
export interface RefreshTokenResponse {
    token: string;
    expiresAt: string;
}
export interface ListIdeasQueryParams {
    page?: number;
    pageSize?: number;
    author?: string;
    status?: 'published' | 'draft' | 'archived';
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}
export interface PaginationMetadata {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
export interface ListIdeasResponse {
    ideas: Array<{
        id: string;
        title: string;
        author: {
            id: string;
            name: string;
            email: string;
        };
        status: string;
        summary: string;
        tags: string[];
        createdAt: string;
        publishedAt: string | null;
    }>;
    pagination: PaginationMetadata;
}
export interface GetIdeaResponse {
    id: string;
    title: string;
    author: {
        id: string;
        name: string;
        email: string;
    };
    status: string;
    metadata: {
        summary: string;
        goals: string | null;
        requirements: string | null;
        tags: string[];
    };
    artifacts: Array<{
        id: string;
        filePath: string;
        fileType: string;
        contentType: string | null;
        sizeBytes: number | null;
        url: string;
    }>;
    gitPath: string;
    gitCommitSha: string | null;
    createdAt: string;
    publishedAt: string | null;
    updatedAt: string;
}
export interface PublishIdeaRequest {
    title: string;
    specification: string;
    artifacts?: Array<{
        filePath: string;
        content: string;
        contentType: string;
    }>;
    tags: string[];
    metadata: {
        summary: string;
        goals: string;
        requirements: string;
    };
}
export interface PublishIdeaResponse {
    id: string;
    title: string;
    gitPath: string;
    gitCommitSha: string;
    status: string;
    createdAt: string;
    publishedAt: string;
}
export interface ListTemplatesQueryParams {
    type?: 'spec' | 'guideline';
}
export interface ListTemplatesResponse {
    templates: Array<{
        id: string;
        name: string;
        filePath: string;
        templateType: 'spec' | 'guideline';
        currentVersionSha: string;
        lastSyncAt: string;
    }>;
}
export interface GetTemplateResponse {
    id: string;
    name: string;
    content: string;
    filePath: string;
    templateType: 'spec' | 'guideline';
    currentVersionSha: string;
    lastSyncAt: string;
}
export interface UpdateTemplateRequest {
    content: string;
    commitMessage: string;
}
export interface UpdateTemplateResponse {
    id: string;
    currentVersionSha: string;
    validationResults: {
        syntax: 'valid' | 'invalid';
        semantic: 'valid' | 'invalid';
    };
    updatedAt: string;
}
export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
        database: 'connected' | 'disconnected';
        git: 'accessible' | 'inaccessible';
        templateSync: 'up-to-date' | 'outdated' | 'error';
    };
}
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: {
            field?: string;
            reason?: string;
            [key: string]: unknown;
        };
    };
    timestamp: string;
}
//# sourceMappingURL=api.d.ts.map