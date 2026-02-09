import * as path from 'node:path';
import * as vscode from 'vscode';
import { FileIndex, ProjectIndex, SymbolDefinition, SymbolDocParam } from './symbolIndexTypes';

export interface FunctionSignatureInfo {
    name: string;
    params: SymbolDocParam[];
    description?: string;
    returnType?: string;
    returnDescription?: string;
    isColonMethod: boolean;
}

export interface IndexedSymbol {
    symbol: SymbolDefinition;
    fileIndex: FileIndex;
}

export class SymbolIndexManager implements vscode.Disposable {
    private readonly output: vscode.OutputChannel;
    private readonly workspaceRoot?: string;
    private watcher?: vscode.FileSystemWatcher;
    private latestIndexUri?: vscode.Uri;
    private projectIndex?: ProjectIndex;

    constructor(output: vscode.OutputChannel, workspaceRoot?: string) {
        this.output = output;
        this.workspaceRoot = workspaceRoot;
    }

    logDebug(message: string): void {
        this.output.appendLine(`[symbols] ${message}`);
    }

    dispose(): void {
        if (this.watcher) {
            this.watcher.dispose();
        }
    }

    async initialize(): Promise<void> {
        await this.refreshLatestIndex();

        this.watcher = vscode.workspace.createFileSystemWatcher('**/symbols.index.json');
        this.watcher.onDidCreate((uri) => void this.onIndexFileChanged(uri));
        this.watcher.onDidChange((uri) => void this.onIndexFileChanged(uri));
        this.watcher.onDidDelete((uri) => void this.onIndexFileDeleted(uri));
    }

    getGlobalSymbols(): IndexedSymbol[] {
        if (!this.projectIndex || !this.projectIndex.globalIndex) {
            return [];
        }

        const results: IndexedSymbol[] = [];
        const symbolsByName = this.projectIndex.globalIndex.symbolsByName;

        for (const name of Object.keys(symbolsByName)) {
            const refs = symbolsByName[name];
            if (!refs || refs.length === 0) {
                continue;
            }

            const ref = refs[0];
            const fileIndex = this.projectIndex.files[ref.file];
            if (!fileIndex) {
                continue;
            }

            const symbol = fileIndex.symbols[ref.symbolId];
            if (!symbol) {
                continue;
            }

            results.push({ symbol, fileIndex });
        }

        return results;
    }

    getSymbolByName(name: string): IndexedSymbol | null {
        if (!this.projectIndex) {
            return null;
        }

        const globalIndex = this.projectIndex.globalIndex;
        if (globalIndex) {
            const refs = globalIndex.symbolsByName[name];
            if (refs && refs.length > 0) {
                const ref = refs[0];
                const fileIndex = this.projectIndex.files[ref.file];
                if (fileIndex) {
                    const symbol = fileIndex.symbols[ref.symbolId];
                    if (symbol) {
                        return { symbol, fileIndex };
                    }
                }
            }
        }

        return this.findGlobalSymbolByName(name);
    }

    getFunctionSignature(functionName: string): FunctionSignatureInfo | null {
        const resolved = this.getSymbolByName(functionName);
        if (!resolved) {
            return null;
        }

        return this.getFunctionSignatureForSymbol(resolved.symbol, resolved.fileIndex);
    }

    getFunctionSignatureForSymbol(symbol: SymbolDefinition, fileIndex: FileIndex): FunctionSignatureInfo | null {
        if (symbol.kind !== 'function' && symbol.kind !== 'macro') {
            return null;
        }

        const params = this.getFunctionParams(symbol, fileIndex);
        return {
            name: symbol.name,
            params,
            description: symbol.doc?.description,
            returnType: symbol.doc?.returnType,
            returnDescription: symbol.doc?.returnDescription,
            isColonMethod: symbol.callable?.isColonMethod ?? false
        };
    }

    getSymbolAtPosition(document: vscode.TextDocument, position: vscode.Position): IndexedSymbol | null {
        const fileIndex = this.getFileIndexForDocument(document);
        if (!fileIndex || !fileIndex.symbolSpans || fileIndex.symbolSpans.length === 0) {
            return null;
        }

        const textBeforeCursor = document.getText(new vscode.Range(0, 0, position.line, position.character));
        const byteOffset = Buffer.byteLength(textBeforeCursor, 'utf8');

        for (const span of fileIndex.symbolSpans) {
            const start = span.range.start;
            const end = start + span.range.length;
            if (byteOffset >= start && byteOffset < end) {
                const symbol = fileIndex.symbols[span.symbolId];
                if (symbol) {
                    return { symbol, fileIndex };
                }
            }
        }

        return null;
    }

    getProjectRoot(): string | undefined {
        return this.projectIndex?.projectRoot;
    }

    getFileIndexForDocument(document: vscode.TextDocument): FileIndex | null {
        if (!this.projectIndex || document.uri.scheme === 'untitled') {
            return null;
        }

        const projectRoot = this.projectIndex.projectRoot;
        if (!projectRoot) {
            return null;
        }

        const relativePath = path.relative(projectRoot, document.uri.fsPath);
        if (relativePath.startsWith('..')) {
            return null;
        }

        const normalized = relativePath.replace(/\//g, '\\');
        return (
            this.projectIndex.files[normalized] ||
            this.projectIndex.files[relativePath] ||
            this.projectIndex.files[relativePath.replace(/\\/g, '/')]
        ) ?? null;
    }

    async getLocationForSymbol(symbol: SymbolDefinition, fileIndex: FileIndex): Promise<vscode.Location | null> {
        const uri = this.getUriForFileIndex(fileIndex);
        if (!uri) {
            return null;
        }

        const span = symbol.selectionRange ?? symbol.range;
        const range = await this.getRangeForSpan(uri, span);
        if (!range) {
            return null;
        }

        return new vscode.Location(uri, range);
    }

    async getRangeForSpan(uri: vscode.Uri, span: { start: number; length: number }): Promise<vscode.Range | null> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            return this.getRangeForSpanInDocument(document, span);
        } catch {
            return null;
        }
    }

    getRangeForSpanInDocument(
        document: vscode.TextDocument,
        span: { start: number; length: number }
    ): vscode.Range | null {
        const start = this.getPositionForByteOffset(document, span.start);
        const end = this.getPositionForByteOffset(document, span.start + span.length);
        if (!start || !end) {
            return null;
        }
        return new vscode.Range(start, end);
    }

    private async onIndexFileChanged(uri: vscode.Uri): Promise<void> {
        if (!this.latestIndexUri || uri.fsPath === this.latestIndexUri.fsPath) {
            await this.loadIndexFromUri(uri);
            return;
        }

        await this.refreshLatestIndex();
    }

    private async onIndexFileDeleted(uri: vscode.Uri): Promise<void> {
        if (this.latestIndexUri && uri.fsPath === this.latestIndexUri.fsPath) {
            this.latestIndexUri = undefined;
            this.projectIndex = undefined;
        }

        await this.refreshLatestIndex();
    }

    private async refreshLatestIndex(): Promise<void> {
        const files = await vscode.workspace.findFiles('**/symbols.index.json');
        if (files.length === 0) {
            this.logDebug('No symbols.index.json files found.');
            return;
        }

        let latestUri: vscode.Uri | undefined;
        let latestMtime = -1;

        for (const uri of files) {
            try {
                const stat = await vscode.workspace.fs.stat(uri);
                if (stat.mtime > latestMtime) {
                    latestMtime = stat.mtime;
                    latestUri = uri;
                }
            } catch {
                // Ignore files that cannot be stat'ed
            }
        }

        if (latestUri) {
            this.logDebug(`Loading latest symbol index: ${latestUri.fsPath}`);
            await this.loadIndexFromUri(latestUri);
        }
    }

    private async loadIndexFromUri(uri: vscode.Uri): Promise<void> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const json = Buffer.from(content).toString('utf8');
            const parsed = JSON.parse(json) as ProjectIndex;

            this.projectIndex = parsed;
            this.latestIndexUri = uri;
            this.logDebug(`Loaded symbol index (schema ${parsed.schemaVersion}) from ${uri.fsPath}`);
        } catch (error) {
            this.output.appendLine(`[symbols] Failed to load symbol index: ${String(error)}`);
        }
    }

    private getFunctionParams(symbol: SymbolDefinition, fileIndex: FileIndex): SymbolDocParam[] {
        if (symbol.doc?.params && symbol.doc.params.length > 0) {
            return symbol.doc.params;
        }

        const params: SymbolDocParam[] = [];
        const callableParams = symbol.callable?.params ?? [];

        for (const paramId of callableParams) {
            const paramSymbol = fileIndex.symbols[paramId];
            if (paramSymbol) {
                params.push({ name: paramSymbol.name, type: undefined, description: undefined });
                continue;
            }

            const name = paramId?.trim();
            if (name) {
                params.push({ name, type: undefined, description: undefined });
            }
        }

        return params;
    }

    private findGlobalSymbolByName(name: string): IndexedSymbol | null {
        if (!this.projectIndex) {
            return null;
        }

        for (const fileIndex of Object.values(this.projectIndex.files)) {
            for (const symbol of Object.values(fileIndex.symbols)) {
                if (symbol.name === name && symbol.visibility === 'global') {
                    return { symbol, fileIndex };
                }
            }
        }

        return null;
    }

    private getUriForFileIndex(fileIndex: FileIndex): vscode.Uri | null {
        const projectRoot = this.projectIndex?.projectRoot ?? this.workspaceRoot;
        if (!projectRoot) {
            return null;
        }

        const normalizedPath = fileIndex.path.replace(/\//g, '\\');
        const fsPath = path.isAbsolute(normalizedPath)
            ? normalizedPath
            : path.join(projectRoot, normalizedPath);
        return vscode.Uri.file(fsPath);
    }

    private getPositionForByteOffset(
        document: vscode.TextDocument,
        byteOffset: number
    ): vscode.Position | null {
        if (byteOffset < 0) {
            return null;
        }

        let remaining = byteOffset;
        for (let line = 0; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text;
            const lineBytes = Buffer.byteLength(lineText, 'utf8');

            if (remaining <= lineBytes) {
                const character = this.getCharacterOffsetFromBytes(lineText, remaining);
                return new vscode.Position(line, character);
            }

            const newlineBytes = document.eol === vscode.EndOfLine.LF ? 1 : 2;
            remaining -= lineBytes + newlineBytes;
        }

        const lastLine = Math.max(0, document.lineCount - 1);
        const lastChar = document.lineAt(lastLine).text.length;
        return new vscode.Position(lastLine, lastChar);
    }

    private getCharacterOffsetFromBytes(lineText: string, byteOffset: number): number {
        let bytes = 0;
        let index = 0;

        for (const char of lineText) {
            const charBytes = Buffer.byteLength(char, 'utf8');
            if (bytes + charBytes > byteOffset) {
                return index;
            }
            bytes += charBytes;
            index += char.length;
        }

        return lineText.length;
    }
}
