import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const Ajv = require('ajv');
import { DEVTOOLS_DIR_NAME, DEVTOOLS_FILE_NAME, DEVTOOLS_SCHEMA_FILE_NAME } from './baseDefs';
import { dirExists, fileExists } from './utils';

export type DevtoolsWatch =
    | { type: 'global'; symbol: string;[key: string]: unknown }
    | { type: 'expression'; expression: string;[key: string]: unknown }
    | { type: 'memory'; expression: string;[key: string]: unknown };

export type DevtoolsControlNode =
    | {
        type: 'knob';
        label?: string;
        symbol: string;
        min?: number;
        max?: number;
        step?: number;
        size?: 'small' | 'medium' | 'large';
        [key: string]: unknown;
    }
    | {
        type: 'triggerButton';
        label?: string;
        eval: string;
        [key: string]: unknown;
    }
    | {
        type: 'slider';
        label?: string;
        symbol: string;
        min?: number;
        max?: number;
        step?: number;
        [key: string]: unknown;
    }
    | {
        type: 'toggle';
        label?: string;
        symbol: string;
        [key: string]: unknown;
    }
    | {
        type: 'page';
        label?: string;
        controls: DevtoolsControlNode[];
        [key: string]: unknown;
    }
    | {
        type: 'group';
        label?: string;
        orientation?: 'horizontal' | 'vertical';
        controls: DevtoolsControlNode[];
        [key: string]: unknown;
    }
    | {
        type: 'divider';
        [key: string]: unknown;
    }
    | {
        type: 'enumButtons';
        label?: string;
        symbol: string;
        options: { label?: string; value: string | number }[];
        [key: string]: unknown;
    }
    | {
        type: 'label';
        label?: string; // this needs to be optional!
        expression: string;
        [key: string]: unknown;
    }
    | {
        type: 'number';
        label?: string;
        symbol: string;
        min?: number;
        max?: number;
        step?: number;
        [key: string]: unknown;
    }
    | {
        type: 'string';
        label?: string;
        symbol: string;
        [key: string]: unknown;
    }
    | {
        type: 'tabs';
        tabs: {
            label?: string;
            controls: DevtoolsControlNode[];
        }[];
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
                        label: { type: 'string' },
                        symbol: { type: 'string', minLength: 1 },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        step: { type: 'number' },
                        size: { type: 'string', enum: ['small', 'medium', 'large'] },
                    },
                    required: ['type', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'triggerButton' },
                        label: { type: 'string' },
                        eval: { type: 'string', minLength: 1 },
                    },
                    required: ['type', 'eval'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'slider' },
                        label: { type: 'string' },
                        symbol: { type: 'string', minLength: 1 },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        step: { type: 'number' },
                    },
                    required: ['type', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'toggle' },
                        label: { type: 'string' },
                        symbol: { type: 'string', minLength: 1 },
                    },
                    required: ['type', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'page' },
                        label: { type: 'string' },
                        controls: {
                            type: 'array',
                            items: { $ref: '#/$defs/controlNode' },
                        },
                    },
                    required: ['type', 'controls'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'group' },
                        label: { type: 'string' },
                        orientation: {
                            type: 'string',
                            enum: ['horizontal', 'vertical'],
                        },
                        controls: {
                            type: 'array',
                            items: { $ref: '#/$defs/controlNode' },
                        },
                    },
                    required: ['type', 'controls'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'divider' },
                    },
                    required: ['type'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'enumButtons' },
                        label: { type: 'string' },
                        symbol: { type: 'string', minLength: 1 },
                        options: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    label: { type: 'string' },
                                    value: { type: ['string', 'number'] },
                                },
                                required: ['value'],
                            },
                        },
                    },
                    required: ['type', 'symbol', 'options'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'label' },
                        label: { type: 'string' },
                        expression: { type: 'string', minLength: 1 },
                    },
                    required: ['type', 'expression'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'number' },
                        label: { type: 'string' },
                        symbol: { type: 'string', minLength: 1 },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        step: { type: 'number' },
                    },
                    required: ['type', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'string' },
                        label: { type: 'string' },
                        symbol: { type: 'string', minLength: 1 },
                    },
                    required: ['type', 'symbol'],
                },
                {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        type: { const: 'tabs' },
                        tabs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    label: { type: 'string' },
                                    controls: {
                                        type: 'array',
                                        items: { $ref: '#/$defs/controlNode' },
                                    },
                                },
                                required: ['controls'],
                            },
                        },
                    },
                    required: ['type', 'tabs'],
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

export async function ensureDevtoolsSchemaForWorkspace(
    workspaceRoot?: string,
    output?: { appendLine: (value: string) => void },
): Promise<void> {
    if (!workspaceRoot) {
        return;
    }

    const devtoolsDir = path.join(workspaceRoot, DEVTOOLS_DIR_NAME);
    if (!(await dirExists(devtoolsDir))) {
        return;
    }

    const devtoolsPath = path.join(devtoolsDir, DEVTOOLS_FILE_NAME);
    if (!(await fileExists(devtoolsPath))) {
        return;
    }

    const schemaPath = path.join(devtoolsDir, DEVTOOLS_SCHEMA_FILE_NAME);
    if (await fileExists(schemaPath)) {
        return;
    }

    try {
        await fs.writeFile(schemaPath, JSON.stringify(devtoolsSchema, null, 2), 'utf8');
    } catch (error) {
        output?.appendLine(`[devtools] failed to write ${DEVTOOLS_SCHEMA_FILE_NAME}`);
        return;
    }

    // inject $schema reference into devtools.json
    try {
        const raw = await fs.readFile(devtoolsPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return;
        }
        const updated = {
            $schema: `./${DEVTOOLS_SCHEMA_FILE_NAME}`,
            ...parsed,
        };
        await fs.writeFile(devtoolsPath, JSON.stringify(updated, null, 2), 'utf8');
    } catch (error) {
        output?.appendLine(`[devtools] failed to update ${DEVTOOLS_FILE_NAME} schema reference`);
    }
}
