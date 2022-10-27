import { Engine } from "../src/engine";
import { Insights, InsightsMap } from "../src/insights";
import { Context, DSL } from "../src/dsl";

import { test, expect } from "@jest/globals"

import * as fs from 'fs';

type Result = {
    reports: string[],
    solve: string[],
    properties: Map<string, string>
}

function run(log: string, rules: string[], expected: Result): void {
    const text: string = fs.readFileSync(`./logs/${log}`, 'utf-8');
    const engine: Engine = new Engine(false);
    const insights: InsightsMap = Insights.create();

    engine.load(text);

    const reports: string[] = [];
    const solve: string[] = [];

    const context: Context = {
        lines: engine.logLines,
        properties: new Map(),

        report: text => reports.push(text),
        solve: text => solve.push(text)
    }

    for (const key of rules) {
        const dsl: DSL | undefined = insights[key];
        if (dsl === undefined) throw new Error(`Invalid rule: '${key}'`);

        dsl.fn.fn(context);
    }

    const actual: Result = {
        reports,
        solve,
        properties: context.properties
    }

    expect(actual).toStrictEqual(expected);
}

test('minecraft and forge version', () => run('optifine.log', [
    'minecraft_and_forge_version'
], {
    reports: [
        'Minecraft 1.18.2, Forge 40.1.73',
    ],
    solve: [],
    properties: new Map([
        ['minecraft', '1.18.2'],
        ['forge', '40.1.73'],
    ])
}));

test('detect optifine', () => run('optifine.log', [
    'minecraft_and_forge_version',
    'optifine_version'
], {
    reports: [
        'Minecraft 1.18.2, Forge 40.1.73',
        'Optifine 1.18.2_HD_U_H9_pre1'
    ],
    solve: [],
    properties: new Map([
        ['minecraft', '1.18.2'],
        ['forge', '40.1.73'],
        ['optifine', '1.18.2_HD_U_H9_pre1']
    ])
}));