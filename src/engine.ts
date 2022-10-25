import { IOption, IOptions, Options } from "./options";
import { getElementById, requireType } from "./utils";


export class Engine {

    public static instance(): Engine {
        return requireType((window as any).engine, Engine);
    }

    private readonly logTag: HTMLDivElement;
    private readonly logLines: LogLine[];

    private readonly stackTraceCountTag: HTMLSpanElement;
    
    private options: IOptions;

    public constructor() {
        this.logTag = getElementById('log', HTMLDivElement);

        this.stackTraceCountTag = getElementById('stack-trace-count', HTMLSpanElement);

        this.logLines = [];
        this.options = Options.create();
    }

    public load(text: string) {

        let lines: string[] = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            let line: string = lines[i] as string;

            let time: string | null = null;
            let source: string | null = null;
            let level: LogLevel | null = null;

            let message: string = line;

            const timeMatch = /^\[([0-9]+:[0-9]+:[0-9]+)\] /.exec(message);
            if (timeMatch !== null) {
                time = timeMatch[1] as string;
                message = message.substring((timeMatch[0] as string).length);
            }

            const sourceLevelMatch = /^\[([^\/]+)\/(INFO|DEBUG|WARN|ERROR|FATAL)\]: /.exec(message);
            if (sourceLevelMatch !== null) {
                source = sourceLevelMatch[1] as string;
                level = sourceLevelMatch[2] as LogLevel;
                message = message.substring((sourceLevelMatch[0] as string).length);
            }

            const pTag = document.createElement('p');
            
            applyLevelToTag(pTag, level);

            // Inspect if this is the first line of a stack trace
            const exceptionMatch = /^([A-Za-z0-9\.]+): /.exec(line);
            if (exceptionMatch !== null) {
                let prevLogLine = this.logLines[this.logLines.length - 1] as LogLine;

                let exceptionType = exceptionMatch[1] as string;
                let exceptionMessage = message.substring((exceptionMatch[0] as string).length);

                let exceptionTag = document.createElement('p');

                applyLevelToTag(exceptionTag, prevLogLine.level);

                let exception: ExceptionInfo = {
                    type: exceptionType,
                    message: exceptionMessage,

                    stacktrace: [],
                    cause: null,

                    tag: exceptionTag
                };
                let latestException: ExceptionInfo = exception;

                // Capture stack trace(s)
                for (i++; i < lines.length; i++)
                {
                    const stackTraceLine = lines[i] as string;
                    const stackTraceMatch = /^[ \t]+at /.exec(stackTraceLine);
                    if (stackTraceMatch !== null) {

                        const stackTraceTag = document.createElement('p');
                        
                        applyLevelToTag(stackTraceTag, prevLogLine.level);

                        const stackTraceInfo: LineInfo = {
                            line: stackTraceLine,
                            tag: stackTraceTag
                        }

                        latestException.stacktrace.push(stackTraceInfo);
                        continue;
                    }

                    const longStackTraceMatch = /^[ \t]+\.\.\. [0-9]+ more/.exec(stackTraceLine);
                    if (longStackTraceMatch !== null) {
                        const stackTraceTag = document.createElement('p');
                        
                        applyLevelToTag(stackTraceTag, prevLogLine.level);

                        const stackTraceInfo: LineInfo = {
                            line: stackTraceLine,
                            tag: stackTraceTag
                        }

                        latestException.stacktrace.push(stackTraceInfo);
                        continue;
                    }

                    const causeMatch = /^Caused by: ([A-Za-z0-9\.]+): /.exec(stackTraceLine);
                    if (causeMatch !== null) {

                        const causeType: string = causeMatch[1] as string;
                        const causeMessage: string = stackTraceLine.substring((causeMatch[0] as string).length);

                        const causeTag = document.createElement('p');
                        
                        applyLevelToTag(causeTag, prevLogLine.level);

                        latestException.cause = {
                            type: causeType,
                            message: causeMessage,

                            stacktrace: [],
                            cause: null,

                            tag: causeTag
                        };
                        latestException = latestException.cause;
                        continue;
                    }

                    i--;
                    break;
                }

                prevLogLine.exception.push(exception);
                continue;
            }

            if (level === 'FATAL') {
                level = 'ERROR';
            }

            if (time === null && source === null && level === null) {
                // Append to previous line

                let prevLogLine = this.logLines[this.logLines.length - 1] as LogLine;

                prevLogLine.message.push({
                    line: message,
                    tag: pTag
                })
                continue;
            }

            this.logLines.push({
                message: [{
                    line: message,
                    tag: pTag
                }],
                time,
                source,
                level,
                tag: pTag,
                exception: []
            });
        }

        for (let line of this.logLines) {
            update(line, this.options);
            this.logTag.appendChild(line.tag);
            for (let e of line.exception) {
                addExceptionInfo(e, this.logTag);
            }
        }

        // Update stack trace display
        let count = 0;
        for (let line of this.logLines) {
            if (line.exception.length > 0) count++;
        }
        this.stackTraceCountTag.innerText = `(${count})`;
    }

    public set(key: IOption, value: boolean): void {

        this.options[key] = value;

        for (let line of this.logLines) {
            update(line, this.options);
        }
    }
}

function addExceptionInfo(e: ExceptionInfo | null, tag: HTMLDivElement) {
    if (e !== null) {
        tag.appendChild(e.tag);
        for (let st of e.stacktrace) {
            tag.appendChild(st.tag);
        }
        addExceptionInfo(e.cause, tag);
    }
}

function applyLevelToTag(tag: HTMLParagraphElement, level: LogLevel | null) {
    if (level === 'DEBUG') {
        tag.classList.add('log-debug');
    } else if (level === 'INFO') {
        tag.classList.add('log-info');
    } else if (level === 'WARN') {
        tag.classList.add('log-warn');
    } else if (level === 'ERROR' || level === 'FATAL') {
        tag.classList.add('log-error');
    }
}

function update(line: LogLine, options: IOptions) {

    const hideLevel: boolean = !options.levelFor(line.level, true);

    line.tag.hidden = hideLevel;

    let message: string = (line.message[0] as LineInfo).line;

    if (options.source || options.level) {
        if (!options.source) {
            // Only level
            if (line.level !== null) {
                message = `[${line.level}] ${message}`;
            }
        } else if (!options.level) {
            // Only source
            if (line.source !== null) {
                message = `[${line.source}] ${message}`;
            }
        } else {
            // Both
            if (line.level !== null && line.source !== null) {
                message = `[${line.source} / ${line.level}] ${message}`;
            } else if (line.level !== null) {
                message = `[${line.level}] ${message}`;
            } else if (line.source !== null) {
                message = `[${line.source}] ${message}`;
            }
        }
    }

    if (options.timestamps && line.time !== null) {
        message = `[${line.time}] ${message}`;
    }

    message = encodeHtml(message);
    
    (line.message[0] as LineInfo).tag.innerHTML = message;

    for (let i = 1; i < line.message.length; i++) {
        let messageLine: LineInfo = line.message[i] as LineInfo;

        messageLine.tag.hidden = hideLevel;
        messageLine.tag.innerHTML = encodeHtml(messageLine.line);
    }

    for (let e of line.exception) {
        e.tag.hidden = !options.stacktrace || hideLevel;

        e.tag.innerHTML = encodeHtml(`${e.type}: ${e.message}`);

        let e0: ExceptionInfo | null = e;
        while (e0 !== null) {
            for (let st of e0.stacktrace) {
                st.tag.hidden = !options.stacktrace || hideLevel;
                st.tag.innerHTML = encodeHtml(st.line);
            }

            e0 = e0.cause;
            if (e0 !== null) {
                e0.tag.hidden = hideLevel;
                e0.tag.innerHTML = encodeHtml(`Caused by: ${e0.type}: ${e0.message}`);
            }
        }
    }
}

function encodeHtml(text: string): string {
    return text.replaceAll('\t', '    ').replaceAll(' ', '&nbsp;');
}

type LogLine = {
    message: LineInfo[],
    time: string | null,
    source: string | null,
    level: LevelInfo | null,

    exception: ExceptionInfo[]

    tag: HTMLParagraphElement
}

type ExceptionInfo = {
    type: string,
    message: string,

    stacktrace: LineInfo[]
    cause: ExceptionInfo | null,

    tag: HTMLParagraphElement,
}

type LineInfo = {
    line: string,
    tag: HTMLParagraphElement
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
