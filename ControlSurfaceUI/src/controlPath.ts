export const CONTROL_PATH_ROOT = "root";
export const CONTROL_PATH_CONTROL_PREFIX = "c";
export const CONTROL_PATH_TAB_PREFIX = "t";

export type ControlPathSegment =
    | { kind: "root" }
    | { kind: "control"; index: number }
    | { kind: "tab"; index: number };

export const buildControlPath = (parentPath: string[], index: number): string[] => [
    ...parentPath,
    `${CONTROL_PATH_CONTROL_PREFIX}${index}`,
];

export const buildTabPath = (parentPath: string[], tabIndex: number): string[] => [
    ...parentPath,
    `${CONTROL_PATH_TAB_PREFIX}${tabIndex}`,
];

export const parseControlPathSegment = (segment: string): ControlPathSegment | undefined => {
    if (segment === CONTROL_PATH_ROOT) {
        return { kind: "root" };
    }

    if (segment.startsWith(CONTROL_PATH_CONTROL_PREFIX)) {
        const index = Number.parseInt(segment.slice(CONTROL_PATH_CONTROL_PREFIX.length), 10);
        if (!Number.isNaN(index)) {
            return { kind: "control", index };
        }
    }

    if (segment.startsWith(CONTROL_PATH_TAB_PREFIX)) {
        const index = Number.parseInt(segment.slice(CONTROL_PATH_TAB_PREFIX.length), 10);
        if (!Number.isNaN(index)) {
            return { kind: "tab", index };
        }
    }

    return undefined;
};

export const isPathEqual = (a: string[] | null | undefined, b: string[] | null | undefined): boolean => {
    if (!a || !b || a.length !== b.length) {
        return false;
    }
    return a.every((segment, index) => segment === b[index]);
};
