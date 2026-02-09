import * as vscode from 'vscode';
import { FunctionSignatureInfo, SymbolIndexManager } from './SymbolIndexManager';
import { FileIndex, SymbolDefinition } from './symbolIndexTypes';

export class Tic80HoverProvider implements vscode.HoverProvider {
    private readonly indexManager: SymbolIndexManager;

    constructor(indexManager: SymbolIndexManager) {
        this.indexManager = indexManager;
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const indexed = this.indexManager.getSymbolAtPosition(document, position);
        if (indexed) {
            return this.buildHoverForSymbol(indexed.symbol, indexed.fileIndex);
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

        return this.buildHoverForSymbol(byName.symbol, byName.fileIndex);
    }

    private buildHoverForSymbol(
        symbol: SymbolDefinition,
        fileIndex: FileIndex
    ): vscode.Hover | null {
        if (symbol.kind === 'function' || symbol.kind === 'macro') {
            const signatureInfo = this.indexManager.getFunctionSignatureForSymbol(symbol, fileIndex);
            if (!signatureInfo) {
                return null;
            }

            const markdown = this.buildFunctionDocumentation(signatureInfo);
            return new vscode.Hover(markdown);
        }

        if (symbol.doc?.description) {
            return new vscode.Hover(new vscode.MarkdownString(symbol.doc.description));
        }

        return null;
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
