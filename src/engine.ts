import { Insights, InsightsMap } from "./insights";
import { LogException, LogLine } from "./logs";


export class Engine {
    
    public logLines: LogLine[];
    public readonly insights: InsightsMap;

    private readonly isWebEnabled: boolean;

    public constructor(isWebEnabled: boolean) {
        this.isWebEnabled = isWebEnabled;

        this.logLines = [];
        this.insights = Insights.create();
    }

    public load(text: string) {

        // Clear
        this.clear();
        this.logLines = [];

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

                exception.push(exceptionMessage, this.isWebEnabled);

                // Capture stack trace(s)
                for (i++; i < lines.length; i++)
                {
                    const stackTraceLine = lines[i] as string;
                    if (/^[ \t]+at /.test(stackTraceLine) || /^[ \t]+\.\.\. [0-9]+ more/.test(stackTraceLine)) {
                        latestException.pushTrace(stackTraceLine, this.isWebEnabled);
                        continue;
                    }

                    const causeMatch = /^Caused by: ([A-Za-z0-9\.]+): /.exec(stackTraceLine);
                    if (causeMatch !== null) {
                        const causeType: string = causeMatch[1] as string;
                        const causeMessage: string = stackTraceLine.substring((causeMatch[0] as string).length);

                        latestException = latestException.pushCause(causeType);
                        latestException.push(causeMessage, this.isWebEnabled);
                        continue;
                    }

                    let futurePrefix: PrefixParseResult = parsePrefixLine(stackTraceLine);

                    if (futurePrefix.time === null && futurePrefix.level === null && futurePrefix.source === null && latestException.trace.length == 0) {
                        // If we hit a recognized line, then we abort parsing.
                        // Otherwise, we accumulate lines as part of the exception message *if* it's not already part of the stack trace.
                        latestException.push(stackTraceLine, this.isWebEnabled);
                        continue;
                    }

                    // Did not recognize this line; abort and continue;
                    break;
                }
                i--;
                continue;
            }

            if (time === null || source === null || level === null) {
                const prev = this.peek();
                if (prev === null) {
                    console.log(`Unable to parse line: ${line}`);
                }
                prev?.push(message, this.isWebEnabled);
                continue;
            }

            const logLine = LogLine.create(time, source, level);
            logLine.push(message, this.isWebEnabled);

            this.logLines.push(logLine);
        }

        this.build();
        this.update();
    }

    protected clear(): void {}
    protected build(): void {}
    protected update(): void {}

    protected peek(): LogLine | null { 
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
    
    const timeMatch = /^\[([0-9A-Za-z:\. ]+)\] /.exec(message);
    if (timeMatch !== null) {
        time = timeMatch[1] as string;
        message = message.substring((timeMatch[0] as string).length);
    }

    const sourceLevelMatch = /^\[([^\/]+)\/(INFO|DEBUG|WARN|ERROR|FATAL)\]/.exec(message);
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
