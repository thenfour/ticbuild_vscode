import * as vscode from 'vscode';
import { FileIndex, SymbolDefinition } from './symbolIndexTypes';
import { SymbolIndexManager } from './SymbolIndexManager';

export class Tic80DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    private readonly indexManager: SymbolIndexManager;

    constructor(indexManager: SymbolIndexManager) {
        this.indexManager = indexManager;
    }

    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const fileIndex = this.indexManager.getFileIndexForDocument(document);
        if (!fileIndex) {
            return [];
        }

        return this.buildDocumentSymbols(document, fileIndex);
    }

    private buildDocumentSymbols(
        document: vscode.TextDocument,
        fileIndex: FileIndex
    ): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        const entries = Object.values(fileIndex.symbols);

        for (const symbol of entries) {
            const kind = this.mapSymbolKind(symbol);
            if (!kind) {
                continue;
            }

            const range = this.indexManager.getRangeForSpanInDocument(document, symbol.range);
            const selectionRange = this.indexManager.getRangeForSpanInDocument(document, symbol.selectionRange);
            if (!range || !selectionRange) {
                continue;
            }

            const detail = symbol.doc?.description ?? '';
            const docSymbol = new vscode.DocumentSymbol(symbol.name, detail, kind, range, selectionRange);
            symbols.push(docSymbol);
        }

        return symbols;
    }

    private mapSymbolKind(symbol: SymbolDefinition): vscode.SymbolKind | null {
        switch (symbol.kind) {
            case 'function':
            case 'macro':
                return vscode.SymbolKind.Function;
            case 'globalVariable':
            case 'localVariable':
            case 'param':
                return vscode.SymbolKind.Variable;
            case 'field':
                return vscode.SymbolKind.Field;
            case 'type':
                return vscode.SymbolKind.Class;
            default:
                return null;
        }
    }
}
