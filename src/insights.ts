import { DSL, find } from "./dsl";

export type InsightsMap = { [key: string]: DSL };

export module Insights {
    let cache: { [key: string]: DSL } | null = null;

    export function create(): { [key: string]: DSL } {
        if (cache === null) {
            //const start: number = performance.now();
            cache = build();
            //const stop: number = performance.now();
            //console.log(`Built ${Object.keys(cache).length} insight rules in ${Math.round(stop - start)} ms`);
        }
        return cache;
    }
}

const build: () => InsightsMap = () => ({

    minecraft_and_forge_version: find('ModLauncher running: args')
        .regex(/--fml.forgeVersion, ([0-9\.]+), --fml.mcVersion, ([0-9\.]+)/)
        .report('Minecraft {2}, Forge {1}')
        .set('minecraft', '{2}')
        .set('forge', '{1}'),
    
    optifine_version: find('[net.optifine.Config/]: [OptiFine] OptiFine_')
        .regex(/OptiFine_(.*)/)
        .report('Optifine {1}')
        .set('optifine', '{1}'),
    
    optifine_1_18_crash: find('Error: java.lang.NoSuchMethodError: \'void net.minecraft.server.level.DistanceManager.addRegionTicket')
        .has('optifine')
        .has('forge')
        .has('minecraft', ['1.18.2'])
        .text('Found a crash known to occur with Optifine and versions of Minecraft 1.18.2. Solution: remove optifine')
        .solve(),
});
