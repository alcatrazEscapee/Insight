

export interface IOptions {
    timestamps: boolean;
    source: boolean;
    level: boolean;
    
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;

    levelFor(level: LevelInfo | null, def: boolean): boolean;
    
    stacktrace: boolean;
}

export type IOption = keyof IOptions & ('timestamps' | 'source' | 'level' | 'debug' | 'info' | 'warn' | 'error' | 'stacktrace');


export class Options implements IOptions {

    public static create(): IOptions {
        return new Options();
    }

    public timestamps: boolean;
    public source: boolean;
    public level: boolean;

    public debug: boolean;
    public info: boolean;
    public warn: boolean;
    public error: boolean;

    public stacktrace: boolean;

    private constructor() {
        this.timestamps = false;
        this.source = true;
        this.level = false;

        this.debug = true;
        this.info = true;
        this.warn = true;
        this.error = true;

        this.stacktrace = true;
    }

    public levelFor(level: LevelInfo | null, def: boolean): boolean {
        switch (level) {
            case 'DEBUG': return this.debug;
            case 'INFO': return this.info;
            case 'WARN': return this.warn;
            case 'ERROR': return this.error;
        }
        return def;
    }
}