
export type Type<T> = new (...args : any[]) => T;

export function getElementById<T>(id: string, type: Type<T>): T {
    const tag: HTMLElement | null = document.getElementById(id);
    if (tag !== null && tag instanceof type) {
        return tag;
    }
    throw new TypeError(`No HTMLElement with id=${id} of type=${type} found, got ${tag}.`);
}

export function hasProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

export function requireNotNull<T>(t: T | null): T {
    if (t === null) {
        throw new TypeError('Null');
    }
    return t;
}

export function requireType<T>(t: T | null, type: Type<T>): T {
    requireNotNull(t);
    if (t instanceof type) {
        return t;
    }
    throw new TypeError('');
}