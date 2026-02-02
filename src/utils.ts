import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// takes tic80 instance info and formats a label
export function formatInstanceLabel(
    args: { title: string; version: string; cartPath: string; }): string {
    const { title, version, cartPath } = args;
    const cartLeaf = cartPath.length > 0 ? path.basename(cartPath) : '';

    if (title.length > 0) {
        return version.length > 0 ? `${title} v${version}` : title;
    }

    if (cartLeaf.length > 0) {
        return cartLeaf;
    }

    return '(empty)';
}

export function isoDateStringToDate(value: string): Date | undefined {
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) {
        return undefined;
    }
    return new Date(ms);
}

export function formatDateDiff(start: Date, end: Date): string | undefined {
    const diffMs = start.valueOf() - end.valueOf();
    if (diffMs < 0) {
        return undefined;
    }
    let totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

// parses "host:port" string into object
export function parseHostPort(value: string): { host: string; port: number } | undefined {
    const [hostPart, portPart] = value.split(':');
    if (!hostPart || !portPart) {
        return undefined;
    }
    const port = Number(portPart);
    if (!Number.isFinite(port) || port <= 0) {
        return undefined;
    }
    return { host: hostPart.trim(), port };
}


export const fileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
};

export const dirExists = async (dirPath: string): Promise<boolean> => {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
};


export const IsNullOrWhitespace = (value: string | null | undefined): boolean => {
    return value === null || value === undefined || value.trim().length === 0;
}