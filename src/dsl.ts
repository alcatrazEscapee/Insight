import { LogLine } from "./logs";


/**
 * Find a log line that contains the string `match`
 */
export function find(match: string): StringDSL {
    return new StringDSL(new Apply<string>(c => c.lines.map(l => l.first()).find(text => text.includes(match))));
}


export type DSL = { readonly fn: Apply<any> };
export type Maybe<T> = T | null | undefined;

export interface Context  {
    lines: LogLine[];
    properties: Map<string, string>;

    report(text: string): void;
    solve(text: string): void;
};


class StringDSL {

    readonly fn: Apply<string>;

    constructor(fn: Apply<string>) {
        this.fn = fn;
    }
    
    // (String -> String)

    /**
     * Set the current text value to `value`.
     */
    text(value: string): StringDSL {
        return new StringDSL(this.fn.map(_ => value));
    }

    // (String -> RegExp)

    /**
     * Apply the regex pattern `pattern` on the current text. Will return the capture groups as `{1}`, `{2}`, etc.
     */
    regex(pattern: RegExp): RegexDSL {
        return new RegexDSL(this.fn.map(c => pattern.exec(c)));
    }

    // DSL

    report(): StringDSL {
        return new StringDSL(this.fn.then((c, v) => c.report(v)));
    }

    solve(): StringDSL {
        return new StringDSL(this.fn.then((c, v) => c.solve(v)));
    }

    set(key: string) {
        return new StringDSL(this.fn.then((c, v) => c.properties.set(key, v)));
    }

    has(key: string, values: string[] | null = null): StringDSL {
        return new StringDSL(this.fn.lazyFilter(c => c.properties.has(key) && (values === null || values.includes(c.properties.get(key) as string))));
    }
}

class RegexDSL {

    private static format(pattern: string, regex: RegExpExecArray): string {
        return pattern.replace(/{(\d+)}/g, (match: string, index: number) => regex[index] ?? match);
    }

    readonly fn: Apply<RegExpExecArray>;

    constructor(fn: Apply<RegExpExecArray>) {
        this.fn = fn;
    }

    // DSL

    report(pattern: string): RegexDSL {
        return new RegexDSL(this.fn.then((c, v) => c.report(RegexDSL.format(pattern, v))));
    }

    solve(pattern: string): RegexDSL {
        return new RegexDSL(this.fn.then((c, v) => c.solve(RegexDSL.format(pattern, v))));
    }

    set(key: string, pattern: string): RegexDSL {
        return new RegexDSL(this.fn.then((c, v) => c.properties.set(key, RegexDSL.format(pattern, v))));
    }

    has(key: string, values: string[] | null = null): RegexDSL {
        return new RegexDSL(this.fn.lazyFilter(c => c.properties.has(key) && (values === null || values.includes(c.properties.get(key) as string))));
    }
}


/**
 * (context -> Maybe<T>)
 */
class Apply<T> {
    readonly fn: (_: Context) => Maybe<T>;

    constructor(fn: (_: Context) => Maybe<T>) {
        this.fn = fn;
    }

    /**
     * (context -> Maybe<T>) -> (T -> T2) -> (context -> Maybe<T2>)
     */
    map<T2>(f: (_: T) => Maybe<T2>): Apply<T2> {
        const fn: (_: Context) => Maybe<T> = this.fn;
        return new Apply<T2>(c => {
            const t: Maybe<T> = fn(c);
            return t === undefined || t === null ? null : f(t);
        });
    }

    /**
     * (context -> Maybe<T>) -> ((context, T) -> boolean) -> (context -> Maybe<T>)
     */
    filter(f: (c: Context, _: T) => boolean): Apply<T> {
        const fn: (_: Context) => Maybe<T> = this.fn;
        return new Apply<T>(c => {
            const t: Maybe<T> = fn(c);
            return t === undefined || t === null || !f(c, t) ? null : t;
        });
    }

    /**
     * (context -> Maybe<T>) -> ((context, T) -> boolean) -> (context -> Maybe<T>)
     */
    lazyFilter(f: (c: Context) => boolean): Apply<T> {
        const fn: (_: Context) => Maybe<T> = this.fn;
        return new Apply<T>(c => f(c) ? fn(c) : null);
    }

    /**
     * (context -> Maybe<T>) -> ((context, T) -> void) -> (context -> Maybe<T>)
     */
    then(f: (c: Context, _: T) => void): Apply<T> {
        const fn: (_: Context) => Maybe<T> = this.fn;
        return new Apply<T>(c => {
            const t: Maybe<T> = fn(c);
            if (t !== undefined && t !== null) f(c, t);
            return t;
        });
    }
}
