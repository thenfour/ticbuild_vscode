import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { isoDateStringToDate } from '../utils';
import { decodeRemotingString, isExpectedHello, safeMetadata, Tic80RemotingClient } from './Tic80RemotingClient';

interface DiscoveryRecord {
    host: string;
    port: number;
    startedAt?: string;
    remotingVersion?: string;
};

interface Tic80RunningInstanceInfo {
    // label: string;
    // description: string;
    // detail?: string;
    // value: string;

    host: string;
    port: number;
    startedAt?: Date;
    remotingVersion?: string;
    hello: string;
    cartPath?: string;
    metaTitle?: string;
    metaVersion?: string;
}

type SessionEntry = {
    filePath: string;
    record: DiscoveryRecord;
    startedAt?: Date;
};

// vs-code agnostic.
export async function discoverRunningInstancesBase(
    timeoutMs: number,
): Promise<Tic80RunningInstanceInfo[]> {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
        return [];
    }

    const sessionDir = path.join(localAppData, 'TIC-80', 'remoting', 'sessions');
    let entries: string[] = [];
    try {
        entries = await fs.readdir(sessionDir);
    } catch (error) {
        return [];
    }

    const sessionFiles =
        entries.filter((name) => /^tic80-remote\..+\.json$/i.test(name));
    const items: Tic80RunningInstanceInfo[] = [];
    const entriesByTarget = new Map<string, SessionEntry[]>();

    const deleteSessionFile = async (filePath: string) => {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // ignore delete failures
        }
    };

    for (const fileName of sessionFiles) {
        const filePath = path.join(sessionDir, fileName);
        let payload: unknown;
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            payload = JSON.parse(raw);
        } catch (error) {
            continue;
        }

        if (!payload || typeof payload !== 'object') {
            continue;
        }

        const record = payload as DiscoveryRecord;

        if (!record.host || !record.port) {
            continue;
        }
        const target = `${record.host}:${record.port}`;
        const startedAt = record.startedAt ? isoDateStringToDate(record.startedAt) : undefined;
        const entry: SessionEntry = {
            filePath,
            record,
            startedAt,
        };
        const list = entriesByTarget.get(target) ?? [];
        list.push(entry);
        entriesByTarget.set(target, list);
    }

    const entriesByNewest = (a: SessionEntry, b: SessionEntry) => {
        const timeA = a.startedAt?.getTime() ?? 0;
        const timeB = b.startedAt?.getTime() ?? 0;
        return timeB - timeA;
    };

    for (const [target, grouped] of entriesByTarget) {
        const ordered = [...grouped].sort(entriesByNewest);
        let connected = false;

        for (let index = 0; index < ordered.length; index += 1) {
            const entry = ordered[index];
            const client = new Tic80RemotingClient(entry.record.host, entry.record.port);
            try {
                await client.connect(timeoutMs);
                const helloRaw = await client.hello();
                const hello = decodeRemotingString(helloRaw);
                if (!isExpectedHello(hello)) {
                    await deleteSessionFile(entry.filePath);
                    continue;
                }

                const cartRaw = await client.cartPath();
                const cartPath = decodeRemotingString(cartRaw).trim();
                const titleRaw = await safeMetadata(client, 'title');
                const versionRaw = await safeMetadata(client, 'version');
                const title = titleRaw ? decodeRemotingString(titleRaw).trim() : '';
                const version = versionRaw ? decodeRemotingString(versionRaw).trim() : '';

                items.push({
                    host: entry.record.host,
                    port: entry.record.port,
                    remotingVersion: entry.record.remotingVersion,
                    hello,
                    startedAt: entry.startedAt,
                    cartPath: cartPath.length > 0 ? cartPath : undefined,
                    metaTitle: title.length > 0 ? title : undefined,
                    metaVersion: version.length > 0 ? version : undefined,
                });

                connected = true;
                // Delete any older duplicates without probing.
                for (const older of ordered.slice(index + 1)) {
                    await deleteSessionFile(older.filePath);
                }
                break;
            } catch (error) {
                await deleteSessionFile(entry.filePath);
            } finally {
                client.close();
            }
        }

        if (!connected) {
            // No live instances found for this target; stale entries already cleaned up.
            continue;
        }
    }

    return items;
}
