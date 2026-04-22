export type IdeaStatus = 'draft' | 'published' | 'archived';
export interface Idea {
    id: string;
    userId: string;
    title: string;
    status: IdeaStatus;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
    gitPath: string;
    gitCommitSha: string | null;
}
export interface MetadataRecord {
    id: string;
    ideaId: string;
    summary: string;
    goals: string | null;
    requirements: string | null;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
export type ArtifactFileType = 'specification' | 'diagram' | 'mockup' | 'reference';
export interface Artifact {
    id: string;
    ideaId: string;
    filePath: string;
    fileType: ArtifactFileType;
    contentType: string | null;
    sizeBytes: number | null;
    createdAt: Date;
}
export interface Tag {
    id: string;
    name: string;
    usageCount: number;
    createdAt: Date;
}
export interface IdeaWithMetadata extends Idea {
    metadata: MetadataRecord;
    artifacts: Artifact[];
    tags: Tag[];
}
//# sourceMappingURL=idea.d.ts.map