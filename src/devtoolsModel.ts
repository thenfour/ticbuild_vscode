import * as fs from 'node:fs/promises';

const Ajv = require('ajv');
import { DEVTOOLS_FILE_NAME } from './baseDefs';

export type DevtoolsWatch =
    | { type: 'global'; symbol: string;[key: string]: unknown }
    | { type: 'expression'; expression: string;[key: string]: unknown }
    | { type: 'memory'; expression: string;[key: string]: unknown };

export type DevtoolsControlNode =
    | {
        type: 'knob';
        label: string;
        symbol: string;
        min?: number;
        max?: number;
        step?: number;
        size?: 'small' | 'medium' | 'large';
        [key: string]: unknown;
    }
    | {
        type: 'button';
        label: string;
        eval: string;
        [key: string]: unknown;
    }
    | {
        type: 'slider';
        label: string;
        symbol: string;
        min?: number;
        max?: number;
        step?: number;
        [key: string]: unknown;
    }
    | {
        type: 'toggle';
        label: string;
        symbol: string;
        [key: string]: unknown;
    }
    | {
        type: 'page';
        label: string;
        controls: DevtoolsControlNode[];
        [key: string]: unknown;
    }
    | {
        type: 'group';
        label: string;
        orientation?: 'horizontal' | 'vertical';
        controls: DevtoolsControlNode[];
        [key: string]: unknown;
    };

export type DevtoolsFile = {
    watches?: DevtoolsWatch[];
    controlSurfaceRoot?: DevtoolsControlNode[];
    [key: string]: unknown;
};

const devtoolsSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://thenfour.com/schemas/ticbuild/devtools.schema.json',
    title: 'ticbuild devtools.json',
    type: 'object',
    properties: {
        watches: {
            type: 'array',
            nullable: true,
            items: {
                oneOf: [
                    {
                        type: 'object',
                        properties: {
                            type: { const: 'global' },
                            symbol: { type: 'string', minLength: 1 },
                        },
                        required: ['type', 'symbol'],
                        additionalProperties: true,
                    },
                    {
                        type: 'object',
                        properties: {
                            type: { const: 'expression' },
                            expression: { type: 'string', minLength: 1 },
                        },
                        required: ['type', 'expression'],
                        additionalProperties: true,
                    },
                    {
                        type: 'object',
                        properties: {
                            type: { const: 'memory' },
                            expression: { type: 'string', minLength: 1 },
                        },
                        required: ['type', 'expression'],
                        additionalProperties: true,
                    },
                ],
            },
        },
        controlSurfaceRoot: {
            type: 'array',
            nullable: true,
            items: {
                $ref: '#/$defs/controlNode',
            },
        },
    },
    required: [],
    additionalProperties: true,
    $defs: {
        controlNode: {
            oneOf: [
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'knob' },
                        label: { type: 'string', minLength: 1 },
                        symbol: { type: 'string', minLength: 1 },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        step: { type: 'number' },
                        size: { type: 'string', enum: ['small', 'medium', 'large'] },
                    },
                    required: ['type', 'label', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'button' },
                        label: { type: 'string', minLength: 1 },
                        eval: { type: 'string', minLength: 1 },
                    },
                    required: ['type', 'label', 'eval'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'slider' },
                        label: { type: 'string', minLength: 1 },
                        symbol: { type: 'string', minLength: 1 },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        step: { type: 'number' },
                    },
                    required: ['type', 'label', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'toggle' },
                        label: { type: 'string', minLength: 1 },
                        symbol: { type: 'string', minLength: 1 },
                    },
                    required: ['type', 'label', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'page' },
                        label: { type: 'string', minLength: 1 },
                        controls: {
                            type: 'array',
                            items: { $ref: '#/$defs/controlNode' },
                        },
                    },
                    required: ['type', 'label', 'controls'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'group' },
                        label: { type: 'string', minLength: 1 },
                        orientation: {
                            type: 'string',
                            enum: ['horizontal', 'vertical'],
                        },
                        controls: {
                            type: 'array',
                            items: { $ref: '#/$defs/controlNode' },
                        },
                    },
                    required: ['type', 'label', 'controls'],
                },
            ],
        },
    },
} as const;

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateDevtools = ajv.compile(devtoolsSchema);

type AjvError = { instancePath?: string; message?: string };

const formatErrors = (errors: AjvError[] | null | undefined): string => {
    if (!errors || errors.length === 0) {
        return 'Unknown validation error.';
    }
    return errors
        .map((error) => `${error.instancePath || '(root)'} ${error.message ?? ''}`)
        .join('; ');
};

export const DEVTOOLS_SCHEMA = devtoolsSchema;

export async function readDevtoolsFile(
    devtoolsPath: string,
    output?: { appendLine: (value: string) => void },
): Promise<DevtoolsFile> {
    let raw: string;
    try {
        raw = await fs.readFile(devtoolsPath, 'utf8');
    } catch (error) {
        return {};
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        output?.appendLine(`[devtools] ${DEVTOOLS_FILE_NAME} parse error`);
        return {};
    }

    if (!validateDevtools(parsed)) {
        output?.appendLine(
            `[devtools] ${DEVTOOLS_FILE_NAME} schema validation error: ${formatErrors(
                validateDevtools.errors,
            )}`,
        );
        return {};
    }

    return parsed as DevtoolsFile;
}

export async function loadDevtoolsWatches(
    devtoolsPath: string,
    output?: { appendLine: (value: string) => void },
): Promise<DevtoolsWatch[]> {
    const data = await readDevtoolsFile(devtoolsPath, output);
    return Array.isArray(data.watches) ? data.watches : [];
}
