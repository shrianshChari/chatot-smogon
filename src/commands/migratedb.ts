import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommand } from '../types/slash-command-base.js';
import { pool } from '../helpers/createPool.js';


interface IRaterDump {
    channelid: string,
    meta: string,
    gen: string,
    userid: string,
    ping: string,
}

interface ICCPrefDump {
    serverid: string,
    channelid: string,
    tier: string,
    role: string,
    gen: string,
    stage: string,
    cooldown: number,
    prefix: string,
}

interface IDBDump {
    raters: IRaterDump[],
    cc: ICCPrefDump[],
}

const ccSubObj: { [key: string] : { gens : string[], tiers: string[], url: string } } = {
    '758' : {
        gens: ['9'],
        tiers: ['ou'],
        url: 'https://www.smogon.com/forums/forums/ou-analyses.758/',
    },
    '759' : {
        gens: ['9'],
        tiers: ['uber'],
        url: 'https://www.smogon.com/forums/forums/ubers-analyses.759/',
    },
    '539' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['uber'],
        url: 'https://www.smogon.com/forums/forums/past-generation-ubers-analyses.539/',
    },
    '772' : {
        gens: ['9'],
        tiers: ['uu'],
        url: 'https://www.smogon.com/forums/forums/uu-analyses.772/',
    },
    '576' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['uu'],
        url: 'https://www.smogon.com/forums/forums/past-generation-uu-analyses.576/',
    },
    '774' : {
        gens: ['9'],
        tiers: ['nu'],
        url: 'https://www.smogon.com/forums/forums/nu-analyses.774/',
    },
    '587' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['nu'],
        url: 'https://www.smogon.com/forums/forums/past-generation-nu-analyses.587/',
    },
    '775' : {
        gens: ['9'],
        tiers: ['pu'],
        url: 'https://www.smogon.com/forums/forums/pu-analyses.775/',
    },
    '844' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['pu'],
        url: 'https://www.smogon.com/forums/forums/past-generation-pu-analyses.844/',
    },
    '760' : {
        gens: ['9'],
        tiers: ['lc'],
        url: 'https://www.smogon.com/forums/forums/lc-analyses.760/',
    },
    '540' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['lc'],
        url: 'https://www.smogon.com/forums/forums/past-generation-lc-analyses.540/',
    },
    '761' : {
        gens: ['9'],
        tiers: ['doubles'],
        url: 'https://www.smogon.com/forums/forums/doubles-ou-analyses.761/',
    },
    '541' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['doubles'],
        url: 'https://www.smogon.com/forums/forums/past-gen-doubles-ou-analyses.541/',
    },
    '762' : {
        gens: ['9'],
        tiers: ['monotype'],
        url: 'https://www.smogon.com/forums/forums/monotype-analyses.762/',
    },
    '660' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['monotype'],
        url: 'https://www.smogon.com/forums/forums/past-generation-monotype-analyses.660/',
    },
    '763' : {
        gens: ['9'],
        tiers: ['nfe', 'almost-any-ability', '2v2-doubles', 'godly-gift', 'ag', 'bh', 'mix-and-mega', 'stabmons', 'zu', 'partners-in-crime', 'inh', 'ubers-uu'],
        url: 'https://www.smogon.com/forums/forums/om-analyses.763/',
    },
    '770' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['nfe', 'almost-any-ability', '2v2-doubles', 'godly-gift', 'ag', 'bh', 'mix-and-mega', 'stabmons', 'zu', 'partners-in-crime', 'inh', 'ubers-uu'],
        url: 'https://www.smogon.com/forums/forums/past-generation-om-analyses.770/',
    },
    '764' : {
        gens: ['9'],
        tiers: ['1v1'],
        url: 'https://www.smogon.com/forums/forums/1v1-analyses.764/',
    },
    '476' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['1v1'],
        url: 'https://www.smogon.com/forums/forums/past-generation-1v1-analyses.476/',
    },
    '765' : {
        gens: ['9'],
        tiers: ['national-dex'],
        url: 'https://www.smogon.com/forums/forums/national-dex-analyses.765/',
    },
    '828' : {
        gens: ['9'],
        tiers: ['national-dex-monotype'],
        url: 'https://www.smogon.com/forums/forums/natdex-mono-analyses.828/',
    },
    '839' : {
        gens: ['9'],
        tiers: ['national-dex-uu'],
        url: 'https://www.smogon.com/forums/forums/natdex-uu-analyses.839/',
    },
    '768' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        tiers: ['cap'],
        url: 'https://www.smogon.com/forums/forums/cap-analyses.768/',
    },
    '766' : {
        gens: ['9'],
        tiers: ['bss'],
        url: 'https://www.smogon.com/forums/forums/battle-stadium-analyses.766/',
    },
    '767' : {
        gens: ['9'],
        tiers: ['vgc'],
        url: 'https://www.smogon.com/forums/forums/vgc-analyses.767/',
    },
    '148' : {
        gens: ['1', '2', '3', '4', '5', '6', '7', '8'],
        tiers: ['ou'],
        url: 'https://www.smogon.com/forums/forums/past-generation-analyses.148/',
    },
    '512' : {
        gens: ['1'],
        tiers: ['nu', 'pu', 'stadium-ou', 'tradebacks-ou', 'uu', 'uber'],
        url: 'https://www.smogon.com/forums/forums/rby-other-tier-analyses.512/',
    },
    '608' : {
        gens: ['7'],
        tiers: ['lgpe-ou'],
        url: 'https://www.smogon.com/forums/forums/pokemon-lets-go-analyses.608/',
    },
    '707' : {
        gens: ['8'],
        tiers: ['bdsp-ou'],
        url: 'https://www.smogon.com/forums/forums/bdsp-ou-analyses.707/',
    },
    '871' : {
        gens: ['9'],
        tiers: ['draft'],
        url: 'https://www.smogon.com/forums/forums/draft-league-analyses.871/',
    },
};
/**
 * Populates the database of rater information
 * This is currently a dev-only command.
 * It can also only be run once so...don't run it twice. Yes, it's jank.
 */
export const command: SlashCommand = {
    global: false,
    guilds: ['1040378543626002442'],
    // setup the slash command builder
    data: new SlashCommandBuilder()
        .setName('migratedb')
        .setDescription('Transitions data from 1 table to another')
        .setDMPermission(false)
        .setDefaultMemberPermissions(0),

    // execute our desired task
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        // query the db to get the info we need
        const dbQuery = await pool.query(`
        WITH old_raters AS
        (SELECT channelid, meta, gen, userid, ping FROM chatot.raters),

        cc AS
        (SELECT serverid, channelid, tier, role, gen, stage, cooldown, prefix FROM chatot.ccprefs)

        SELECT json_build_object(
            'raters', (SELECT COALESCE(JSON_AGG(old_raters.*), '[]') FROM old_raters),
            'cc', (SELECT COALESCE(JSON_AGG(cc.*), '[]') FROM cc)
        ) AS data`);
    
        // unpack
        const db = dbQuery.rows.map((row: { data: IDBDump }) => row.data)[0];


        /**
         * RATERLISTS
         */

        const rmtUsers: string[] = [];
        const rmtPings: string[] = [];
        const rmtMetas: string[] = [];
        const rmtChannelsDB: string[] = [];
        for (const row of db.raters) {
            // remap the meta + gen to PS
            // the gen is the standard 2 letter abbr + LGPE + BDSP
            let genNum = '';
            if (row.gen === 'LGPE') {
                genNum = '7';
            }
            else if (row.gen === 'BDSP') {
                genNum = '8';
            }
            else {
                genNum = genConversion(row.gen);
            }

            // map the meta
            // first convert to lower case
            const dbMeta = row.meta.toLowerCase();
            let meta = '';
            // overwrite the db with the new meta values we need
            // ps uses a format of genXmeta
            if (dbMeta === 'ou' && row.gen === 'LGPE') {
                meta = 'letsgoou';
            }
            else if (dbMeta === 'ou' && row.gen === 'BDSP') {
                meta = 'bdspou';
            }
            else if (dbMeta === 'dou') {
                meta = 'doublesou';
            }
            else if (dbMeta === 'mono') {
                meta = 'monotype';
            }
            else if (dbMeta === 'natdex ou') {
                meta = 'nationaldex';
            }
            else if (dbMeta === 'natdex uu') {
                meta = 'nationaldexuu';
            }
            else if (dbMeta === 'natdex ag') {
                meta = 'nationaldexag';
            }
            else if (dbMeta === 'natdex mono') {
                meta = 'nationaldexmonotype';
            }
            else if (dbMeta === 'bh') {
                meta = 'balancedhackmons';
            }
            else if (dbMeta === 'mnm') {
                meta = 'mixandmega';
            }
            else if (dbMeta === 'aaa') {
                meta = 'almostanyability';
            }
            else if (dbMeta === 'gg') {
                meta = 'godlygift';
            }
            else if (dbMeta === 'ph') {
                meta = 'purehackmons';
            }
            else if (dbMeta === 'pic') {
                meta = 'partnersincrime';
            }
            else if (dbMeta === 'inh') {
                meta = 'inheritance';
            }
            else if (dbMeta === 'om mashup' || dbMeta === 'general om') {
                continue;
            }
            else if (dbMeta === 'ag') {
                meta = 'anythinggoes';
            }
            else {
                meta = dbMeta;
            }
            // form the meta name using PS syntax
            // we need to bump PH from Gen6 -> 7, so overwrite that one manually
            if (dbMeta === 'ph' && genNum === '6') {
                const psMeta = `gen7${meta}`;
                rmtMetas.push(psMeta);
            }
            else {
                const psMeta = `gen${genNum}${meta}`;
                rmtMetas.push(psMeta);
            }
            

            // push to the arrays
            rmtUsers.push(row.userid);
            rmtPings.push(row.ping);
            
            rmtChannelsDB.push(row.channelid);
        }

        /**
         * RMT CHANNELS
         */
        /*
        // combine the metas and channels into an array so that we can get the unique combos
        const chanMetaPairs = rmtChannelsDB.map((id, idx) => ([id, rmtMetas[idx]]));

        // I'm unsure if we still have the old RMT channels in there atp, so add them just in case
        // because we still may need to get line counts from the old rmt channels.
        // they don't have any raters associated with them, and never will, but we need to keep them in mind
        if (botConfig.MODE === Modes.Production) {
            chanMetaPairs.push(
                // legacy rmt 1
                ['630478290729041920', 'gen9ou'],
                // legacy rmt 2
                ['635257209416187925', 'gen9ou'],
                // old 1v1 chan
                ['1059673638145622096', 'gen91v1'],
            );
        }

        // loop over all the entries to find the unique arrays
        const uniqueChanMetaPairs: string[][] = [];
        for (const pair of chanMetaPairs) {
            if (!uniqueChanMetaPairs.some(p => p[0] === pair[0] && p[1] === pair[1])) {
                uniqueChanMetaPairs.push(pair);
            }
        }

        // uncombine the unique pairs so we can insert them
        const rmtChannelIDs = uniqueChanMetaPairs.map(p => p[0]);
        const rmtChannelMetas = uniqueChanMetaPairs.map(p => p[1]);
        */
        const uniqueChanMetaPairs: [string, string][] = [];
        // not every meta has a rater rn, so just pulling from the rater list will require staff to set it up manually for a lot of channels
        // so, let's just hardcode what goes where
        
        uniqueChanMetaPairs.push(
            // pu
            ['1061136198208344084', 'gen9pu'],
            // nu
            ['1061136091056439386', 'gen9nu'],
            // ru
            ['1061135917160607766', 'gen9ru'],
            // lc
            ['1061135027599048746', 'gen9lc'],
            // bss
            ['1060690402711183370', 'gen9bss'],
            // ag
            ['1060682013453078711', 'gen9anythinggoes'],
            // old gen ou
            ['1060339824537641152', 'gen8ou'],
            ['1060339824537641152', 'gen5ou'],
            ['1060339824537641152', 'gen1ou'],
            ['1060339824537641152', 'gen2ou'],
            ['1060339824537641152', 'gen3ou'],
            ['1060339824537641152', 'gen6ou'],
            ['1060339824537641152', 'gen7letsgoou'],
            ['1060339824537641152', 'gen8bdspou'],
            ['1060339824537641152', 'gen7ou'],
            ['1060339824537641152', 'gen4ou'],
            // natdex non ou
            ['1060037469472555028', 'gen9nationaldexuu'],
            ['1060037469472555028', 'gen9nationaldexmonotype'],
            ['1060037469472555028', 'gen9nationaldexag'],
            // uber
            ['1059901370477576272', 'gen9ubers'],
            // uu
            ['1059743348728004678', 'gen9uu'],
            // nat dex ou'
            ['1059714627384115290', 'gen9nationaldex'],
            // cap
            ['1059708679814918154', 'gen9cap'],
            // vgc
            ['1059704283072831499', 'gen9vgc'],
            // 1v1 -- old
            ['1059673638145622096', 'gen91v1'],
            // 1v1 -- new
            ['1089349311080439882', 'gen91v1'],
            // mono
            ['1059658237097545758', 'gen9monotype'],
            // om
            ['1059657287293222912', 'gen9balancedhackmons'],
            ['1059657287293222912', 'gen9almostanyability'],
            ['1059657287293222912', 'gen9godlygift'],
            ['1059657287293222912', 'gen7purehackmons'],
            ['1059657287293222912', 'gen9mixandmega'],
            ['1059657287293222912', 'gen9inheritance'],
            ['1059657287293222912', 'gen9partnersincrime'],
            ['1059657287293222912', 'gen9stabmons'],
            // um
            ['1208795569649356820', 'gen9ubersuu'],
            ['1208795569649356820', 'gen9anythinggoes'],
            ['1208795569649356820', 'gen9zu'],
            ['1208795569649356820', 'gen92v2doubles'],
            ['1208795569649356820', 'gen9nfe'],
            // dou
            ['1059655497587888158', 'gen9doublesou'],
            // ou
            ['1059653209678950460', 'gen9ou'],
            // rmt1 -- legacy system
            ['630478290729041920', 'gen9ou'],
            // rmt2 -- legacy system
            ['635257209416187925', 'gen9ou'],
        );
        
        const rmtChannelIDs = uniqueChanMetaPairs.map(p => p[0]);
        const rmtChannelMetas = uniqueChanMetaPairs.map(p => p[1]);

        /**
         * C&C PREFS
         */
        const servers: string[] = [];
        const channels: string[] = [];
        const tiers: string[] = [];
        const roles: string[] = [];
        const gens: string[] = [];
        const stages: string[] = [];
        const cooldowns: number[] = [];
        const prefixes: string[] = [];

        for (const row of db.cc) {
            // remap the tiers
            if (row.tier === 'ubers') {
                tiers.push('uber');
            }
            else if (row.tier === 'dou') {
                tiers.push('doubles');
            }
            else if (row.tier === 'mono') {
                tiers.push('monotype');
            }
            else if (row.tier === 'natdex ou') {
                tiers.push('national-dex');
            }
            else if (row.tier === 'natdex uu') {
                tiers.push('national-dex-uu');
            }
            else if (row.tier === 'natdex ag') {
                tiers.push('national-dex-ag');
            }
            else if (row.tier === 'natdex mono') {
                tiers.push('national-dex-monotype');
            }
            else if (row.tier === '2v2') {
                tiers.push('2v2-doubles');
            }
            else if (row.tier === 'm&m') {
                tiers.push('mix-and-mega');
            }
            else if (row.tier === 'aaa') {
                tiers.push('almost-any-ability');
            }
            else if (row.tier === 'gg') {
                tiers.push('godly-gift');
            }
            else if (row.tier === 'ph') {
                tiers.push('pure-hackmons');
            }
            else if (row.tier === 'stab') {
                tiers.push('stabmons');
            }
            else if (row.tier === 'pic') {
                tiers.push('partners-in-crime');
            }
            else if (row.tier === 'inheritance') {
                tiers.push('inh');
            }
            else if (row.tier === 'uubers') {
                tiers.push('ubers-uu');
            }
            else if (row.tier === 'Ubers') {
                continue;
            }
            else {
                tiers.push(row.tier.replace(/ /g, '-').toLowerCase());
            }

            // map the prefixes
            // some of these could be combined with the above for efficiency but...meh
            // at least now it's all in 1 place?
            // OMs
            if (['nfe', 'aaa', '2v2', 'gg', 'ag', 'bh', 'm&m', 'stab', 'zu', 'ph', 'pic', 'inheritance', 'uubers'].includes(row.tier)) {
                prefixes.push(row.tier);
            }
            // Old Gens
            else if (row.tier === 'ou' || row.tier === 'PU' || row.tier === 'pu' || row.tier === 'uu') {
                if (Number(row.gen) < 9) {
                    prefixes.push(`gen ${row.gen}`);
                }
                else {
                    prefixes.push('');
                }
            }
            // RBY Other
            else if (row.gen === '1' && ['nu', 'pu', 'stadium ou', 'tradebacks ou', 'uu', 'ubers'].includes(row.tier)) {
                prefixes.push(row.tier);
            }
            else {
                prefixes.push(row.prefix);
            }

            // map the gens
            const gen = genConversion(row.gen).toLowerCase();
            gens.push(gen);

            // push the other stuff we don't need to update
            // this is kind of inefficient, but at the end we can easily upsert
            servers.push(row.serverid);
            channels.push(row.channelid);
            roles.push(row.role);
            stages.push(row.stage);
            cooldowns.push(row.cooldown);
        }

        /**
         * C&C FORUMS
         */
        
        const forumIDs: number[] = [];
        const forumTiers: string[] = [];
        const forumGens: string[] = [];

        for (const [k, v] of Object.entries(ccSubObj)) {
            for (const gen of v.gens) {
                const genAbbr = genConversion(gen).toLowerCase();

                for (const tier of v.tiers) {
                    forumIDs.push(Number(k));
                    forumTiers.push(tier);
                    forumGens.push(genAbbr);
                }
            }
        }

        /**
         * STORAGE
         */

        // query the pool with a transaction
        const pgClient = await pool.connect();
        try {
            // start
            await pgClient.query('BEGIN');
            // raters
            await pgClient.query(`
            INSERT INTO chatot.raterlists (meta, userid, ping)
            VALUES (UNNEST($1::text[]), UNNEST($2::text[]), UNNEST($3::text[]))
            ON CONFLICT (meta, userid)
            DO NOTHING`, [rmtMetas, rmtUsers, rmtPings]);
            // rmt channels
            await pgClient.query(`
            INSERT INTO chatot.rmtchans (channelid, meta)
            VALUES (UNNEST($1::text[]), UNNEST($2::text[]))
            ON CONFLICT (channelid, meta)
            DO NOTHING`, [rmtChannelIDs, rmtChannelMetas]);
            // cc prefs
            // we reuse the table, so we need to do it in multiple steps so we can avoid conflicts and dupes
            await pgClient.query('DELETE FROM chatot.ccprefs WHERE tier=\'Ubers\'');
            await pgClient.query(`
            UPDATE chatot.ccprefs
            SET gen = renames.new_gen
            FROM
                (VALUES
                    ('1', 'rb'),
                    ('2', 'gs'),
                    ('3', 'rs'),
                    ('4', 'dp'),
                    ('5', 'bw'),
                    ('6', 'xy'),
                    ('7', 'sm'),
                    ('8', 'ss'),
                    ('9', 'sv')
                ) as renames(old_gen, new_gen)
            WHERE gen = renames.old_gen`);
            await pgClient.query(`
            UPDATE chatot.ccprefs
            SET tier = renames.new_tier
            FROM
                (VALUES
                    ('ubers', 'uber'),
                    ('dou', 'doubles'),
                    ('mono', 'monotype'),
                    ('natdex ou', 'national-dex'),
                    ('natdex uu', 'national-dex-uu'),
                    ('natdex ag', 'national-dex-ag'),
                    ('natdex mono', 'national-dex-monotype'),
                    ('2v2', '2v2-doubles'),
                    ('m&m', 'mix-and-mega'),
                    ('aaa', 'almost-any-ability'),
                    ('gg', 'godly-gift'),
                    ('ph', 'pure-hackmons'),
                    ('stab', 'stabmons'),
                    ('pic', 'partners-in-crime'),
                    ('inheritance', 'inh'),
                    ('uubers', 'ubers-uu'),
                    ('lgpe ou', 'lgpe-ou'),
                    ('bdsp-ou', 'bdsp-ou'),
                    ('stadium ou', 'stadium-ou'),
                    ('tradebacks ou', 'tradebacks-ou'),
                    ('PU', 'pu')
                ) as renames(old_tier, new_tier)
            WHERE tier = renames.old_tier`);
            await pgClient.query(`
            INSERT INTO chatot.ccprefs (serverid, channelid, tier, role, gen, stage, cooldown, prefix)
            VALUES (UNNEST($1::text[]), UNNEST($2::text[]), UNNEST($3::text[]), UNNEST($4::text[]), UNNEST($5::text[]), UNNEST($6::chatot.ccstagealert[]), UNNEST($7::int[]), UNNEST($8::text[]))
            ON CONFLICT (serverid, channelid, tier, gen, stage)
            DO UPDATE SET serverid=EXCLUDED.serverid, channelid=EXCLUDED.channelid, tier=EXCLUDED.tier, gen=EXCLUDED.gen, prefix=EXCLUDED.prefix`, [servers, channels, tiers, roles, gens, stages, cooldowns, prefixes]);
            // forum map
            await pgClient.query(`
            INSERT INTO chatot.ccforums (forumid, tier, gen)
            VALUES (UNNEST($1::integer[]), UNNEST($2::text[]), UNNEST($3::text[]))
            ON CONFLICT (forumid, tier, gen)
            DO NOTHING`, [forumIDs, forumTiers, forumGens]);
            // cooldowns
            await pgClient.query('TRUNCATE TABLE chatot.cooldown');
            // end
            await pgClient.query('COMMIT');
        }
        catch (e) {
            await pgClient.query('ROLLBACK');
            // if this errors we have bigger problems, so log it
            throw e;
        }
        finally {
            pgClient.release();
        }

        await interaction.followUp('Databases migrated');
    },

};


function genConversion(gen: string) {
    const gens = {
        'SV': '9',
        'SS': '8',
        'SM': '7',
        'XY': '6',
        'BW': '5',
        'DP': '4',
        'RS': '3',
        'GS': '2',
        'RB': '1',
    };

    for (const [k, v] of Object.entries(gens)) {
        if (gen === k) {
            return v;
        }
        else if (gen === v) {
            return k;
        }
    }
    
    return gen;
}