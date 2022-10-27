import { Context } from "./dsl";
import { Engine } from "./engine";
import { LogLine } from "./logs";
import { IOption, IOptions, Options } from "./options";
import { getElementById, requireType } from "./utils";


export class WebEngine extends Engine {

    public static instance(): WebEngine {
        return requireType((window as any).engine, WebEngine);
    }


    private readonly logTag: HTMLDivElement;
    private readonly insightTag: HTMLDivElement;

    private readonly debugCountTag: HTMLSpanElement;
    private readonly infoCountTag: HTMLSpanElement;
    private readonly warnCountTag: HTMLSpanElement;
    private readonly errorCountTag: HTMLSpanElement;

    private readonly stackTraceCountTag: HTMLSpanElement;

    private options: IOptions;

    constructor() {
        super(true);

        this.logTag = getElementById('log', HTMLDivElement);
        this.insightTag = getElementById('insights', HTMLDivElement);

        this.debugCountTag = getElementById('debug-count', HTMLSpanElement);
        this.infoCountTag = getElementById('info-count', HTMLSpanElement);
        this.warnCountTag = getElementById('warn-count', HTMLSpanElement);
        this.errorCountTag = getElementById('error-count', HTMLSpanElement);
        this.stackTraceCountTag = getElementById('stack-trace-count', HTMLSpanElement);

        this.options = Options.create();
    }

    public override load(text: string) {
        super.load(text);

        // Update counts
        this.debugCountTag.innerText = `(${this.count(line => line.level == 'DEBUG')})`;
        this.infoCountTag.innerText = `(${this.count(line => line.level == 'INFO')})`;
        this.warnCountTag.innerText = `(${this.count(line => line.level == 'WARN')})`;
        this.errorCountTag.innerText = `(${this.count(line => line.level == 'ERROR')})`;

        this.stackTraceCountTag.innerText = `(${this.count(line => line.exceptions.length > 0)})`;
    }

    public set(key: IOption, value: boolean): void {
        this.options[key] = value;
        this.update();
    }

    protected override clear() {        
        while (this.logTag.lastChild) this.logTag.removeChild(this.logTag.lastChild);
        while (this.insightTag.lastChild) this.insightTag.removeChild(this.insightTag.lastChild);
    }

    protected override build(): void {
        for (let line of this.logLines) {
            line.build(this.logTag);
        }

        // Apply Insights
        const context: Context = {
            lines: this.logLines,
            properties: new Map(),

            report: text => {
                const tag: HTMLParagraphElement = document.createElement('p');
                tag.innerText = text;
                this.insightTag.appendChild(tag);
            },
            solve: text => {
                console.log(`Possible solution (will be a modal eventually): ${text}`);
            }
        }

        const start: number = performance.now();
        for (const rule of Object.values(this.insights)) {
            rule.fn.fn(context);
        }
        const stop: number = performance.now();

        console.log(`Ran ${Object.keys(this.insights).length} insight rules in ${Math.round(stop - start)} ms`);
    }

    protected override update(): void {
        for (let line of this.logLines) {
            line.update(this.options);
        }
    }

    private count(fn: (line: LogLine) => boolean): number {
        let count = 0;
        for (let line of this.logLines) {
            if (fn(line)) {
                count++;
            }
        }
        return count;
    }
}