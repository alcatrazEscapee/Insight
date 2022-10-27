import { IOptions } from "./options";


export interface ILine {
    readonly text: string;
    readonly tag: HTMLParagraphElement;
}

export interface IException {
    readonly type: string;
    readonly message: ILine[];

    readonly trace: ILine[];

    cause: IException | null;
}

export class LogException {

    public static create(type: string, level: LevelInfo): LogException {
        return new LogException(type, level);
    }

    public readonly type: string;
    private readonly level: LevelInfo;
    
    public readonly message: ILine[];
    public readonly trace: ILine[];

    public cause: LogException | null;

    private constructor(type: string, level: LevelInfo) {
        this.type = type;
        this.level = level;
        
        this.message = [];
        this.trace = [];

        this.cause = null;
    }

    public push(line: string, isWebEnabled: boolean): ILine {
        const log: ILine = {
            text: line,
            tag: isWebEnabled ? createTag(this.level) : (undefined as any)
        };
        this.message.push(log);
        return log;
    }

    public pushTrace(line: string, isWebEnabled: boolean): ILine {
        const log: ILine = {
            text: line,
            tag: isWebEnabled ? createTag(this.level) : (undefined as any)
        };
        this.trace.push(log);
        return log;
    }

    public pushCause(type: string): LogException {
        const exc: LogException = LogException.create(type, this.level);
        this.cause = exc;
        return exc;
    }

    public build(tag: HTMLDivElement): void {
        for (let line of this.message) {
            tag.appendChild(line.tag);
        }
        for (let line of this.trace) {
            tag.appendChild(line.tag);
        }
        if (this.cause !== null) {
            this.cause.build(tag);
        }
    }

    public update(options: IOptions, is_cause: boolean = false): void {
        
        const hide: boolean = !options.levelFor(this.level, true);

        let first: boolean = true;
        for (let line of this.message) {
            let text: string = line.text;
            if (first) {
                first = false;
                text = `${is_cause ? 'Caused by: ' : ''}${this.type}: ${text}`;
            }
            line.tag.hidden = hide;
            line.tag.innerHTML = encodeHtml(text);
        }

        for (let line of this.trace) {
            line.tag.hidden = hide || !options.stacktrace;
            line.tag.innerHTML = encodeHtml(line.text);
        }

        if (this.cause !== null) {
            this.cause.update(options, true);
        }
    }
}


export class LogLine {

    public static create(time: string, source: string, level: LevelInfo): LogLine {
        return new LogLine(time, source, level);
    }


    public readonly message: ILine[];
    public readonly exceptions: LogException[];

    private readonly time: string;
    private readonly source: string;
    public readonly level: LevelInfo;

    private constructor(time: string, source: string, level: LevelInfo) {
        this.message = [];
        this.exceptions = [];

        this.time = time;
        this.source = source;
        this.level = level;
    }

    public first(): string {
        return this.message[0]?.text ?? '';
    }

    public push(line: string, isWebEnabled: boolean): ILine {
        const log: ILine = {
            text: line,
            tag: isWebEnabled ? createTag(this.level) : (undefined as any)
        };
        this.message.push(log);
        return log;
    }

    public pushException(type: string): LogException {
        const exc: LogException = LogException.create(type, this.level);
        this.exceptions.push(exc);
        return exc;
    }

    public build(tag: HTMLDivElement): void {
        for (let line of this.message) {
            tag.appendChild(line.tag);
        }
        for (let exc of this.exceptions) {
            exc.build(tag);
        }
    }

    public update(options: IOptions): void {
        const hide: boolean = !options.levelFor(this.level, true);

        let first = true;
        for (let line of this.message) {
            let text = line.text;
            if (first) {
                first = false;
                text = this.updatePrefix(text, options);
            }

            line.tag.hidden = hide;
            line.tag.innerHTML = encodeHtml(text);
        }

        for (let exc of this.exceptions) {
            exc.update(options);
        }
    }

    private updatePrefix(text: string, options: IOptions): string {
        if (options.source && options.level) {
            text = `[${this.source} / ${this.level}] ${text}`;
        } else if (options.source) {
            text = `[${this.source}] ${text}`;
        } else if (options.level) {
            text = `[${this.level}] ${text}`;
        }

        if (options.timestamps) {
            text = `[${this.time}] ${text}`;
        }

        return text;
    }
}

function createTag(level: LevelInfo | null): HTMLParagraphElement {
    const tag: HTMLParagraphElement = document.createElement('p');
    if (level !== null) {
        tag.classList.add(`log-${level.toLowerCase()}`);
    }
    return tag;
}

const HTML_ESCAPE_ENTITIES: {[key: string]: string} = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};


function encodeHtml(text: string): string {
    // if (text.includes('§')) {
    //    text = text.replace(/[\&<>"'`=\/]/g, s => HTML_ESCAPE_ENTITIES[s] as string);
    //}
    //text = text.replace(/[\&<>"'`=\/]/g, s => HTML_ESCAPE_ENTITIES[s] as string);
    return text.replaceAll('\t', '    ').replaceAll(' ', '&nbsp;');
}