export interface Span {
    start: number;
    length: number;
}

export interface SymbolDocParam {
    name: string;
    type?: string;
    description?: string;
}

export interface SymbolDoc {
    name?: string;
    description?: string;
    type?: string;
    returnType?: string;
    returnDescription?: string;
    params?: SymbolDocParam[];
}

export interface SymbolCallable {
    isColonMethod: boolean;
    params: string[];
}

export type SymbolKind =
    | 'localVariable'
    | 'globalVariable'
    | 'macro'
    | 'function'
    | 'param'
    | 'field'
    | 'type';

export interface SymbolDefinition {
    symbolId: string;
    name: string;
    kind: SymbolKind;
    range: Span;
    selectionRange: Span;
    scopeId: string;
    visibility: 'local' | 'global';
    doc?: SymbolDoc;
    callable?: SymbolCallable;
}

export interface ScopeDefinition {
    scopeId: string;
    kind: string;
    range: Span;
    declaredSymbolIds: Record<string, string>;
    parentScopeId: string | null;
}

export interface FileIndex {
    hash: string;
    path: string;
    scopes: ScopeDefinition[];
    symbols: Record<string, SymbolDefinition>;
    symbolSpans?: Array<{ symbolId: string; range: Span }>;
}

export interface GlobalSymbolRef {
    file: string;
    symbolId: string;
}

export interface GlobalIndex {
    symbolsByName: Record<string, GlobalSymbolRef[]>;
}

export interface ProjectIndex {
    schemaVersion: number;
    generatedAt: string;
    projectRoot: string;
    files: Record<string, FileIndex>;
    globalIndex?: GlobalIndex;
}
