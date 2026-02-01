// acquireVsCodeApi should only be called once per webview (avoid multiple acquisitions)

const globalAny = window as typeof window & {
    acquireVsCodeApi?: () => any;
};

// Call it once at module load time
export const vscodeApi = globalAny.acquireVsCodeApi?.();
