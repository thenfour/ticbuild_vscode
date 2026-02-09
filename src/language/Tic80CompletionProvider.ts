import * as vscode from 'vscode';
import { FunctionSignatureInfo, IndexedSymbol, SymbolIndexManager } from './SymbolIndexManager';
import { SymbolDefinition } from './symbolIndexTypes';

export class Tic80CompletionProvider implements vscode.CompletionItemProvider {
    private readonly indexManager: SymbolIndexManager;

    constructor(indexManager: SymbolIndexManager) {
        this.indexManager = indexManager;
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        const items: vscode.CompletionItem[] = [];
        const symbols = this.indexManager.getGlobalSymbols();

        for (const entry of symbols) {
            const item = this.toCompletionItem(entry);
            if (item) {
                items.push(item);
            }
        }

        return items;
    }

    private toCompletionItem(entry: IndexedSymbol): vscode.CompletionItem | null {
        const { symbol, fileIndex } = entry;
        const kind = this.mapCompletionKind(symbol);
        if (!kind) {
            return null;
        }

        const item = new vscode.CompletionItem(symbol.name, kind);
        item.insertText = symbol.name;

        if (symbol.kind === 'function' || symbol.kind === 'macro') {
            const signatureInfo = this.indexManager.getFunctionSignatureForSymbol(symbol, fileIndex);
            if (signatureInfo) {
                item.detail = this.buildSignatureLabel(signatureInfo);
                item.documentation = this.buildFunctionDocumentation(signatureInfo);
            }
        } else if (symbol.doc?.description) {
            item.documentation = new vscode.MarkdownString(symbol.doc.description);
        }

        return item;
    }

    private mapCompletionKind(symbol: SymbolDefinition): vscode.CompletionItemKind | null {
        switch (symbol.kind) {
            case 'function':
            case 'macro':
                return vscode.CompletionItemKind.Function;
            case 'globalVariable':
            case 'localVariable':
                return vscode.CompletionItemKind.Variable;
            case 'field':
                return vscode.CompletionItemKind.Field;
            case 'type':
                return vscode.CompletionItemKind.Class;
            default:
                return null;
        }
    }

    private buildSignatureLabel(signatureInfo: FunctionSignatureInfo): string {
        const paramNames = signatureInfo.params.map((param) => param.name);
        return `${signatureInfo.name}(${paramNames.join(', ')})`;
    }

    private buildFunctionDocumentation(signatureInfo: FunctionSignatureInfo): vscode.MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(this.buildSignatureLabel(signatureInfo), 'lua');

        if (signatureInfo.description) {
            markdown.appendMarkdown(`\n\n${signatureInfo.description}`);
        }

        if (signatureInfo.params.length > 0) {
            markdown.appendMarkdown('\n\n**Parameters:**\n');
            for (const param of signatureInfo.params) {
                const typeText = param.type ? `: ${param.type}` : '';
                const description = param.description ? ` - ${param.description}` : '';
                markdown.appendMarkdown(`- \`${param.name}${typeText}\`${description}\n`);
            }
        }

        if (signatureInfo.returnType || signatureInfo.returnDescription) {
            const returnType = signatureInfo.returnType ? `\`${signatureInfo.returnType}\`` : 'value';
            const returnDescription = signatureInfo.returnDescription ? ` - ${signatureInfo.returnDescription}` : '';
            markdown.appendMarkdown(`\n**Returns:** ${returnType}${returnDescription}\n`);
        }

        return markdown;
    }
}
