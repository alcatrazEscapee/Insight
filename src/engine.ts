import { LogException, LogLine } from "./logs";
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

        // Parse log lines
        let lines: string[] = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line: string = lines[i] as string;
            let {time, source, level, message}: PrefixParseResult = parsePrefixLine(line);

            // Inspect if this is the first line of a stack trace
            const exceptionMatch = /^([A-Za-z0-9\.]+): /.exec(line);
            if (exceptionMatch !== null) {

                let prev: LogLine | null = this.peek();
                if (prev === null) {
                    continue;
                }

                const exceptionType: string = exceptionMatch[1] as string;
                const exceptionMessage: string = message.substring((exceptionMatch[0] as string).length);

                const exception: LogException = prev.pushException(exceptionType);
                let latestException: LogException = exception;

                exception.push(exceptionMessage)

                // Capture stack trace(s)
                for (i++; i < lines.length; i++)
                {
                    const stackTraceLine = lines[i] as string;
                    if (/^[ \t]+at /.test(stackTraceLine) || /^[ \t]+\.\.\. [0-9]+ more/.test(stackTraceLine)) {
                        latestException.pushTrace(stackTraceLine);
                        continue;
                    }

                    const causeMatch = /^Caused by: ([A-Za-z0-9\.]+): /.exec(stackTraceLine);
                    if (causeMatch !== null) {
                        const causeType: string = causeMatch[1] as string;
                        const causeMessage: string = stackTraceLine.substring((causeMatch[0] as string).length);

                        latestException = latestException.pushCause(causeType);
                        latestException.push(causeMessage);
                        continue;
                    }

                    let futurePrefix: PrefixParseResult = parsePrefixLine(stackTraceLine);

                    if (futurePrefix.time === null && futurePrefix.level === null && futurePrefix.source === null && latestException.trace.length == 0) {
                        // If we hit a recognized line, then we abort parsing.
                        // Otherwise, we accumulate lines as part of the exception message *if* it's not already part of the stack trace.
                        latestException.push(stackTraceLine);
                        continue;
                    }

                    // Did not recognize this line; abort and continue;
                    break;
                }
                i--;
                continue;
            }

            if (time === null || source === null || level === null) {
                this.peek()?.push(message);
                continue;
            }

            const logLine = LogLine.create(time, source, level);
            logLine.push(message);

            this.logLines.push(logLine);
        }

        // Build the HTML view
        this.build();

        // Update based on the default UI options
        this.update();

        // Update stack trace display
        let count = 0;
        for (let line of this.logLines) {
            count += line.exceptions.length;
        }
        this.stackTraceCountTag.innerText = `(${count})`;
    }

    public set(key: IOption, value: boolean): void {
        this.options[key] = value;
        this.update();
    }

    private build(): void {
        for (let line of this.logLines) {
            line.build(this.logTag);
        }
    }

    private update(): void {
        for (let line of this.logLines) {
            line.update(this.options);
        }
    }

    private peek(): LogLine | null { 
        const line: LogLine | undefined = this.logLines[this.logLines.length - 1];
        return line === undefined ? null : line;
    }
}

type PrefixParseResult = {
    time: string | null,
    source: string | null,
    level: LevelInfo | null,
    message: string
};

function parsePrefixLine(line: string): PrefixParseResult {
    let time: string | null = null;
    let source: string | null = null;
    let level: LevelInfo | null = null;

    let message: string = line;

    const timeMatch = /^\[([0-9]+:[0-9]+:[0-9]+)\] /.exec(message);
    if (timeMatch !== null) {
        time = timeMatch[1] as string;
        message = message.substring((timeMatch[0] as string).length);
    }

    const sourceLevelMatch = /^\[([^\/]+)\/(INFO|DEBUG|WARN|ERROR|FATAL)\]: /.exec(message);
    if (sourceLevelMatch !== null) {
        source = sourceLevelMatch[1] as string;
        level = asLevelInfo(sourceLevelMatch[2]);
        message = message.substring((sourceLevelMatch[0] as string).length);
    }

    return {
        time,
        source,
        level,
        message
    };
}


function asLevelInfo(text: any): LevelInfo | null {
    if (text === 'DEBUG' || text === 'INFO' || text === 'WARN' || text === 'ERROR') {
        return text;
    } else if (text === 'FATAL') {
        return 'ERROR';
    }
    console.log(`Not a LevelInfo: '${text}'`);
    return null;
}
