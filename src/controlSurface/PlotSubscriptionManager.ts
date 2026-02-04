import * as vscode from 'vscode';
import { RemoteSessionManager } from '../session/RemoteSessionManager';

export type PlotSeriesPayload = {
    expression: string;
    rateHz: number;
    values: number[];
    startTime: number;
    endTime: number;
};

const DEFAULT_RATE_HZ = 20;
const PLOT_WINDOW_MS = 5000;
const RESAMPLE_COUNT = 200;
const MAX_SAMPLES = 5000;

const parseNumericValue = (valueText: string): number | null => {
    if (!valueText) {
        return null;
    }
    try {
        const parsed = JSON.parse(valueText);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) {
            return parsed;
        }
        const numeric = Number(parsed);
        return Number.isFinite(numeric) ? numeric : null;
    } catch {
        const numeric = Number(valueText);
        return Number.isFinite(numeric) ? numeric : null;
    }
};

export const interpolateSignal = (before: number | null, after: number | null, t01: number): number | null => {
    if (before == null && after == null) {
        return null;
    }
    if (before == null) {
        return after;
    }
    if (after == null) {
        return before;
    }
    return t01 < 0.5 ? before : after;
};

const makeKey = (expression: string, rateHz: number) => `${rateHz}:${expression}`;

type PlotSample = { t: number; v: number };

type PlotSeriesState = {
    expression: string;
    rateHz: number;
    samples: PlotSample[];
    lastSampleAt: number;
    count: number;
    busy: boolean;
    paused: boolean;
    pausedAt: number | null;
};

export class PlotSubscriptionManager implements vscode.Disposable {
    private readonly subscriptions = new Map<string, PlotSeriesState>();
    private timer: NodeJS.Timeout | undefined;

    constructor(
        private readonly session: RemoteSessionManager,
        private readonly scheduleUiRefresh: () => void,
        private readonly output: vscode.OutputChannel,
    ) { }

    dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.subscriptions.clear();
    }

    start(): void {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.tick();
        }, 50);
    }

    subscribe(expression: string, rateHz?: number): void {
        if (!expression) {
            return;
        }
        const normalized = Number.isFinite(rateHz) && (rateHz ?? 0) > 0 ? (rateHz as number) : DEFAULT_RATE_HZ;
        const key = makeKey(expression, normalized);
        const existing = this.subscriptions.get(key);
        if (existing) {
            existing.count += 1;
            //this.output.appendLine(`[controlSurface] plot subscribe +1 ${expression} @ ${normalized}Hz (count=${existing.count})`);
            return;
        }
        this.subscriptions.set(key, {
            expression,
            rateHz: normalized,
            samples: [],
            lastSampleAt: 0,
            count: 1,
            busy: false,
            paused: false,
            pausedAt: null,
        });
        //this.output.appendLine(`[controlSurface] plot subscribe ${expression} @ ${normalized}Hz`);
    }

    unsubscribe(expression: string, rateHz?: number): void {
        if (!expression) {
            return;
        }
        const normalized = Number.isFinite(rateHz) && (rateHz ?? 0) > 0 ? (rateHz as number) : DEFAULT_RATE_HZ;
        const key = makeKey(expression, normalized);
        const existing = this.subscriptions.get(key);
        if (!existing) {
            return;
        }
        if (existing.count <= 1) {
            this.subscriptions.delete(key);
            //this.output.appendLine(`[controlSurface] plot unsubscribe ${expression} @ ${normalized}Hz`);
        } else {
            existing.count -= 1;
            //this.output.appendLine(`[controlSurface] plot unsubscribe -1 ${expression} @ ${normalized}Hz (count=${existing.count})`);
        }
    }

    handleSessionStateChange(): void {
        if (this.session.isConnected()) {
            return;
        }
        if (this.subscriptions.size > 0) {
            this.subscriptions.forEach((state) => {
                state.samples = [];
                state.lastSampleAt = 0;
            });
            this.scheduleUiRefresh();
        }
    }

    setPaused(expression: string, rateHz: number | undefined, paused: boolean): void {
        if (!expression) {
            return;
        }
        const normalized = Number.isFinite(rateHz) && (rateHz ?? 0) > 0 ? (rateHz as number) : DEFAULT_RATE_HZ;
        const key = makeKey(expression, normalized);
        const existing = this.subscriptions.get(key);
        if (!existing) {
            return;
        }
        existing.paused = paused;
        existing.pausedAt = paused ? Date.now() : null;
        this.output.appendLine(`[controlSurface] plot ${paused ? "paused" : "resumed"} ${expression} @ ${normalized}Hz`);
    }

    getSnapshot(): Record<string, PlotSeriesPayload> {
        const payload: Record<string, PlotSeriesPayload> = {};

        for (const [key, state] of this.subscriptions.entries()) {
            const endTime = state.paused && state.pausedAt ? state.pausedAt : Date.now();
            const startTime = endTime - PLOT_WINDOW_MS;
            const values = this.resample(state.samples, startTime, endTime, RESAMPLE_COUNT);
            payload[key] = {
                expression: state.expression,
                rateHz: state.rateHz,
                values,
                startTime,
                endTime,
            };
        }

        return payload;
    }

    private resample(samples: PlotSample[], startTime: number, endTime: number, count: number): number[] {
        if (samples.length === 0 || count <= 0) {
            return [];
        }

        const values: number[] = [];
        const span = endTime - startTime;
        if (span <= 0) {
            return values;
        }

        let sampleIndex = 0;
        for (let i = 0; i < count; i += 1) {
            const t = startTime + (i / (count - 1)) * span;
            while (sampleIndex < samples.length && samples[sampleIndex].t < t) {
                sampleIndex += 1;
            }
            const before = sampleIndex > 0 ? samples[sampleIndex - 1] : undefined;
            const after = sampleIndex < samples.length ? samples[sampleIndex] : undefined;

            if (!before && !after) {
                values.push(NaN);
                continue;
            }

            const t01 = before && after && after.t !== before.t
                ? (t - before.t) / (after.t - before.t)
                : 0;
            const result = interpolateSignal(before?.v ?? null, after?.v ?? null, t01);
            values.push(result ?? NaN);
        }

        return values;
    }

    private async tick(): Promise<void> {
        if (!this.session.isConnected()) {
            this.handleSessionStateChange();
            return;
        }

        if (this.subscriptions.size === 0) {
            return;
        }

        const now = Date.now();
        let sampled = false;

        for (const state of this.subscriptions.values()) {
            if (state.busy) {
                continue;
            }
            if (state.paused) {
                continue;
            }
            const intervalMs = Math.max(Math.floor(1000 / state.rateHz), 1);
            if (now - state.lastSampleAt < intervalMs) {
                continue;
            }

            state.busy = true;
            try {
                const valueText = await this.session.evalExpr(state.expression);
                const numeric = parseNumericValue(valueText);
                if (numeric != null) {
                    state.samples.push({ t: now, v: numeric });
                    const retainAfter = now - PLOT_WINDOW_MS * 2;
                    if (state.samples.length > 0) {
                        state.samples = state.samples.filter((sample) => sample.t >= retainAfter);
                    }
                    if (state.samples.length > MAX_SAMPLES) {
                        state.samples.splice(0, state.samples.length - MAX_SAMPLES);
                    }
                    sampled = true;
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.output.appendLine(`[controlSurface] plot eval error: ${message}`);
            } finally {
                state.lastSampleAt = now;
                state.busy = false;
            }
        }

        if (sampled) {
            this.scheduleUiRefresh();
        }
    }
}

export const makePlotSeriesKey = makeKey;
