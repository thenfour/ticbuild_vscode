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

        //const target = `${record.host}:${record.port}`;
        const client = new Tic80RemotingClient(record.host, record.port);
        try {
            await client.connect(timeoutMs);
            const helloRaw = await client.hello();
            const hello = decodeRemotingString(helloRaw);
            if (!isExpectedHello(hello)) {
                continue;
            }

            const cartRaw = await client.cartPath();
            const cartPath = decodeRemotingString(cartRaw).trim();
            const titleRaw = await safeMetadata(client, 'title');
            const versionRaw = await safeMetadata(client, 'version');
            const title = titleRaw ? decodeRemotingString(titleRaw).trim() : '';
            const version = versionRaw ? decodeRemotingString(versionRaw).trim() : '';

            // const label = formatInstanceLabel({
            //     title,
            //     version,
            //     cartPath,
            // });

            //const uptime = formatUptime(record.startedAt);
            // const description = uptime ? `${record.host}:${record.port} (${uptime})` :
            //     `${record.host}:${record.port}`;

            // items.push({
            //     label,
            //     description,
            //     detail: cartPath.length > 0 ? cartPath : undefined,
            //     value: target,
            // });

            items.push({
                host: record.host,
                port: record.port,
                remotingVersion: record.remotingVersion,
                hello,
                startedAt: record.startedAt ? isoDateStringToDate(record.startedAt) : undefined,
                cartPath: cartPath.length > 0 ? cartPath : undefined,
                metaTitle: title.length > 0 ? title : undefined,
                metaVersion: version.length > 0 ? version : undefined,
            });

        } catch (error) {
            // ignore failed entries
        } finally {
            client.close();
        }
    }

    return items;
}
