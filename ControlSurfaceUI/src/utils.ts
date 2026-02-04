
export function typedEntries<K extends PropertyKey, V>( //
    obj: Record<K, V>): Array<[K, V]> {                  //
    return Object.entries(obj) as Array<[K, V]>;
}

export function typedKeys<K extends PropertyKey, V>(
    //
    obj: Record<K, V> //
): K[] {
    return Object.keys(obj) as K[];
}

export function typedValues<K extends PropertyKey, V>(
    //
    obj: Record<K, V> //
): V[] {
    return Object.values(obj) as V[];
}

// converts entries to a Record-ish object.
export function typedFromEntries<K extends PropertyKey, V>(entries: readonly (readonly [K, V])[]): Record<K, V> {
    return Object.fromEntries(entries as readonly (readonly [PropertyKey, unknown])[]) as Record<K, V>;
}

// gets a typed value from a Record-like; myobj[key] returns proper type.
export function typedGet<K extends PropertyKey, V>(obj: Record<K, V>, key: K): V {
    return obj[key];
}




export function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}



export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function invLerp(a: number, b: number, v: number): number {
    if (a === b)
        return 0;
    return (v - a) / (b - a);
}


export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export const clampRange = (v: number, min: number, max: number) => {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return clamp(v, low, high);
};

export const clamp01 = (v: number) => clamp(v, 0, 1);




// you can't just do "value ?? defaultValue" because that treats false as nullish.
export function CoalesceBoolean(value: boolean | null | undefined, defaultValue: boolean): boolean {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    return value;
}


export function classes(...classNames: (string | boolean | undefined)[]) {
    return classNames.filter(Boolean).join(" ");
}

export function IsNullOrWhitespace(str: string | null | undefined): boolean {
    return str === null || str === undefined || !str.trim().length;
}   