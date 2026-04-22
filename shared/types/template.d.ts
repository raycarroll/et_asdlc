export type TemplateType = 'spec' | 'guideline';
export interface Template {
    id: string;
    name: string;
    filePath: string;
    templateType: TemplateType;
    currentVersionSha: string;
    lastSyncAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface TemplateUpdateCache {
    id: string;
    lastCheckTimestamp: Date;
    lastSuccessfulUpdate: Date | null;
    currentVersionSha: string;
    nextCheckDue: Date;
}
export interface ValidationQuestion {
    id: string;
    text: string;
    type: 'multiple-choice' | 'short-answer';
    options?: string[];
    maxLength?: number;
    followup?: {
        if: string;
        text: string;
    };
}
export interface ValidationGuideline {
    name: string;
    description: string;
    version: string;
    questions: ValidationQuestion[];
}
export interface SpecTemplateData {
    title: string;
    author: string;
    createdAt: string;
    summary: string;
    scenarios?: Array<{
        title: string;
        description: string;
        criteria: string[];
    }>;
    requirements?: Array<{
        id: string;
        description: string;
    }>;
    successCriteria?: string;
    [key: string]: unknown;
}
//# sourceMappingURL=template.d.ts.map