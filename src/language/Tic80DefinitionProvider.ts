import * as vscode from 'vscode';
import { SymbolIndexManager } from './SymbolIndexManager';

export class Tic80DefinitionProvider implements vscode.DefinitionProvider, vscode.DeclarationProvider {
    private readonly indexManager: SymbolIndexManager;

    constructor(indexManager: SymbolIndexManager) {
        this.indexManager = indexManager;
    }

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | vscode.Location[] | null> {
        return this.provideLocation(document, position);
    }

    async provideDeclaration(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | vscode.Location[] | null> {
        return this.provideLocation(document, position);
    }

    private async provideLocation(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Location | null> {
        const indexed = this.indexManager.getSymbolAtPosition(document, position);
        if (indexed) {
            return this.indexManager.getLocationForSymbol(indexed.symbol, indexed.fileIndex);
        }

        const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w]*/);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        const byName = this.indexManager.getSymbolByName(word);
        if (!byName) {
            return null;
        }

        return this.indexManager.getLocationForSymbol(byName.symbol, byName.fileIndex);
    }
}
