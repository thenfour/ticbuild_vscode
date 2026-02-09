import * as vscode from 'vscode';
import { FunctionSignatureInfo, SymbolIndexManager } from './SymbolIndexManager';

export class Tic80SignatureHelpProvider implements vscode.SignatureHelpProvider {
    private readonly indexManager: SymbolIndexManager;

    constructor(indexManager: SymbolIndexManager) {
        this.indexManager = indexManager;
    }

    provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): vscode.ProviderResult<vscode.SignatureHelp> {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        const functionCallMatch = this.findFunctionCall(textBeforeCursor);
        if (!functionCallMatch) {
            return null;
        }

        const { functionName, parameterIndex } = functionCallMatch;
        const signatureInfo = this.indexManager.getFunctionSignature(functionName);
        if (!signatureInfo) {
            return null;
        }

        return this.buildSignatureHelp(signatureInfo, parameterIndex);
    }

    private buildSignatureHelp(
        signatureInfo: FunctionSignatureInfo,
        parameterIndex: number
    ): vscode.SignatureHelp {
        const signatureLabel = this.buildSignatureLabel(signatureInfo);
        const signature = new vscode.SignatureInformation(signatureLabel, signatureInfo.description);

        const parameterRanges = this.getParameterRanges(signatureLabel, signatureInfo);
        for (let i = 0; i < signatureInfo.params.length; i++) {
            const param = signatureInfo.params[i];
            const labelRange = parameterRanges[i];
            const paramLabel = labelRange ?? param.name;
            const paramInfo = new vscode.ParameterInformation(paramLabel, param.description);
            signature.parameters.push(paramInfo);
        }

        const signatureHelp = new vscode.SignatureHelp();
        signatureHelp.signatures = [signature];
        signatureHelp.activeSignature = 0;
        signatureHelp.activeParameter = Math.min(parameterIndex, signatureInfo.params.length - 1);
        return signatureHelp;
    }

    private buildSignatureLabel(signatureInfo: FunctionSignatureInfo): string {
        const paramNames = signatureInfo.params.map((param) => param.name);
        return `${signatureInfo.name}(${paramNames.join(', ')})`;
    }

    private getParameterRanges(
        signatureLabel: string,
        signatureInfo: FunctionSignatureInfo
    ): Array<[number, number] | null> {
        const ranges: Array<[number, number] | null> = [];
        let searchStart = 0;

        for (const param of signatureInfo.params) {
            const idx = signatureLabel.indexOf(param.name, searchStart);
            if (idx === -1) {
                ranges.push(null);
                continue;
            }

            const start = idx;
            const end = idx + param.name.length;
            ranges.push([start, end]);
            searchStart = end;
        }

        return ranges;
    }

    private findFunctionCall(
        textBeforeCursor: string
    ): { functionName: string; parameterIndex: number } | null {
        let parenDepth = 0;
        let lastOpenParenIndex = -1;

        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
            const char = textBeforeCursor[i];
            if (char === ')') {
                parenDepth++;
            } else if (char === '(') {
                if (parenDepth === 0) {
                    lastOpenParenIndex = i;
                    break;
                }
                parenDepth--;
            }
        }

        if (lastOpenParenIndex === -1) {
            return null;
        }

        const textBeforeParen = textBeforeCursor.substring(0, lastOpenParenIndex);
        const functionNameMatch = textBeforeParen.match(/([A-Za-z_][\w]*)\s*$/);
        if (!functionNameMatch) {
            return null;
        }

        const functionName = functionNameMatch[1];
        const textInsideParens = textBeforeCursor.substring(lastOpenParenIndex + 1);

        let parameterIndex = 0;
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (const char of textInsideParens) {
            if ((char === '"' || char === "'") && !inString) {
                inString = true;
                stringChar = char;
                continue;
            }
            if (char === stringChar && inString) {
                inString = false;
                continue;
            }
            if (inString) {
                continue;
            }

            if (char === '(' || char === '[' || char === '{') {
                depth++;
            } else if (char === ')' || char === ']' || char === '}') {
                depth = Math.max(0, depth - 1);
            } else if (char === ',' && depth === 0) {
                parameterIndex++;
            }
        }

        return { functionName, parameterIndex };
    }
}
