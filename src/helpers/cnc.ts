/**
 * Functions related to C&C integration
 */
import { pool, sqlPool } from './createPool.js';
import { ccTimeInterval, ccSubIDs, ccMetaObj, ccSubObj } from './constants.js';
import { APIRole, ChannelType, ChatInputCommandInteraction, Client, PrivateThreadChannel, PublicThreadChannel, Role, TextChannel } from 'discord.js';

export async function findNewThreads(client: Client) {
    /**
     * Look for new threads in the relevant subforums
     * 
     * thread_id and node_id are the unique ids of the thread and subforum, respectively
     * post_date is the unix timestamp (sec) the thread was made
     * prefix_id is the id of the prefix on the thread
     * phrase_text is the words the prefix uses (QC, GP, Done, WIP, etc)
     * 
     * The data is spread out between 2 tables -- xf_thread, and xf_phrase
     * phrase_text is stored using the prefix id, with the format 'thread_prefix.PREFIX_ID'
     * FIND_IN_SET returns only the nodes we care about
     * 
     * We only want to find threads made after our last scan
     */
    const [newThreads] = await sqlPool.execute(`
    SELECT thread_id, node_id, xenforo.xf_thread.title, phrase_text
    FROM xenforo.xf_thread
    LEFT JOIN xenforo.xf_phrase
    ON xenforo.xf_phrase.title = CONCAT('thread_prefix.', prefix_id)
    WHERE FIND_IN_SET(node_id, ?)
    AND post_date >= ?`, [ccSubIDs.join(','), 0]);
    // Math.floor(Date.now() / 1000 - ccTimeInterval)

    // cast to meaningful array
    const threadData = newThreads as {
        thread_id: number,
        node_id: number,
        title: string,
        phrase_text: string | null,
    }[] | [];

    // if you didn't get a match, there's nothing to do
    if (!threadData.length) {
        return;
    }

    // if you did get a match, try to figure out the state of the thread
    for (const thread of threadData) {
        // first, try to parse the prefix text, because that will work for most cases
        // we care about: QC ready (tag changed to QC), QC progress, and done
        let stage = '';
        let progress = '';
        let gen = '';
        let tier = '';

        if (thread.phrase_text === 'WIP') {
            stage = 'WIP';
        }
        else if (thread.phrase_text === 'Quality Control') {
            stage = 'QC';
        }
        else if (thread.phrase_text === 'Copyediting') {
            stage = 'GP';
        }
        else if (thread.phrase_text === 'HTML') {
            stage = 'HTML';
        }
        else if (thread.phrase_text === 'Done') {
            stage = 'Done';
        }
        // if it's a resource or an announcement, skip
        else if (thread.phrase_text === 'Resource' || thread.phrase_text === 'Announcement') {
            continue;
        }
        // OM / pastgen OM
        else if (thread.phrase_text && ['NFE', 'AAA', '2v2', 'GG', 'AG', 'BH', 'M&M', 'STAB', 'ZU', 'PH'].includes(thread.phrase_text)) {
            tier = thread.phrase_text;
        }
        // past gens
        else if (thread.phrase_text && ['Gen 1', 'Gen 2', 'Gen 3', 'Gen 4', 'Gen 5', 'Gen 6', 'Gen 7', 'Gen 8'].includes(thread.phrase_text)) {
            const genRE = thread.phrase_text.match(/(?<=Gen )\d/);
            if (genRE) {
                gen = genRE[0];
            }
        }
        // rby other
        else if (thread.phrase_text && ['NU', 'PU', 'Stadium OU', 'Tradebacks OU', 'UU', 'Ubers'].includes(thread.phrase_text)) {
            tier = thread.phrase_text;
        }
        // no tag
        else {
            // regex match results in [match, 'qc/gp', '0/1'][] format
            // const progressions = [...thread.title.matchAll(/(QC|GP)?:?\s?\d\s?\/\s?\d/gi)];
            const progressions = [...'SubRoost Zapdos [QC: 2/2] [GP:0/1]'.matchAll(/(QC|GP)?:?\s?(\d\s?\/\s?\d)/gi)];
            // general progression is WIP, QC, GP, done
            if (thread.title.toLowerCase().includes('done')) {
                stage = 'Done';
            }
            else if (progressions.some(prog => prog.some(val => val.toLowerCase() === 'gp'))) {
                const gpStageProgress = progressions.filter(prog => prog.some(val => val.toLowerCase() === 'gp'));
                stage = 'GP';
                progress = gpStageProgress[0][2];
            }
            else if (progressions.some(prog => prog.some(val => val.toLowerCase() === 'qc'))) {
                const gpStageProgress = progressions.filter(prog => prog.some(val => val.toLowerCase() === 'qc'));
                stage = 'QC';
                progress = gpStageProgress[0][2];
            }
            // if nothing, assume it's wip
            else {
                stage = 'WIP';
            }
        }

        // determine the progress if we haven't already
        if (progress === '') {
            // const progressions = [...thread.title.matchAll(/(QC|GP)?:?\s?\d\s?\/\s?\d/gi)];
            const progressions = [...'SubRoost Zapdos [QC: 2/2] [GP:0/1]'.matchAll(/(QC|GP)?:?\s?(\d\s?\/\s?\d)/gi)];
            // if you found a match from the regex, try to find the entry corresponding to the tag
            if (stage === 'GP' || stage === 'QC') {
                let stageProgress = progressions.filter(prog => prog.some(val => val.toLowerCase() === stage.toLowerCase()));
                // if you found one, a match, then use the match's progress
                if (stageProgress.length) {
                    progress = stageProgress[0][2];
                }
                // if you didn't find a match, it's possible they didn't enter the name of the stage into the title because it's implied by the tag
                // so use the progress of the match that doesn't have text
                else if (progressions.length) {
                    stageProgress = progressions.filter(prog => prog[1] === undefined && prog[2]);
                    progress = stageProgress[0][2];
                }
            }

        }

        const gens: {[key: string]: string} = {
            'sv': '9',
            '9': '9',
            'swsh': '8',
            'ss': '8',
            '8': '8',
            'usum': '7',
            'usm': '7',
            'sm': '7',
            '7': '7',
            'oras': '6',
            'xy': '6',
            '6': '6',
            'b2w2': '5',
            'bw2': '5',
            'bw': '5',
            '5': '5',
            'hgss': '4',
            'dpp': '4',
            'dp': '4',
            '4': '4',
            'rse': '3',
            'rs': '3',
            'adv': '3',
            '3': '3',
            'gsc': '2',
            'gs': '2',
            '2': '2',
            'rby': '1',
            'rb': '1',
            '1': '1',
        };
        // determine the gen if we haven't already
        // past gen OMs are special in that we also have to get the gen from the title
        // everywhere else(?) is determined by either the thread location or prefix
        if (gen === '') {
            // old gen OMs
            if (thread.node_id === 770) {
                // try to find the gen from the title
                const genRegex = /\b((Gen|G|Generation)\s*([1-9])|(SV|SWSH|SS|USUM|USM|SM|ORAS|XY|B2W2|BW2|BW|HGSS|DPP|DP|RSE|RS|ADV|GSC|GS|RBY|RB))*\b/i;
                const matchArr = thread.title.match(genRegex);

                // if there was a match from the regex test...
                if (matchArr !== null) {
                    const genDesr = (matchArr[3] || matchArr[4]).toLowerCase();
                    gen = gens[genDesr];
                }
                // else, no gen was specified, give up
            }
            // otherwise get the gen from the map
            else {
                const genArr = ccSubObj[thread.node_id.toString()].gens;
                gen = genArr[genArr.length - 1];
            }
        }

        // get the tier if we haven't already
        if (tier === '') {
            const tierArr = ccSubObj[thread.node_id.toString()].tiers;
            tier = tierArr[tierArr.length - 1];
        }

        // we have all the data we need, so interact with the cache
        // first, poll the db for this thread id to see if anything changed
        const oldThreadDataPG = await pool.query('SELECT stage, progress FROM chatot.cc_status WHERE thread_id =$1', [thread.thread_id]);
        const oldThreadData: { stage: string, progress: string }[] | [] = oldThreadDataPG.rows;

        if (!oldThreadData.length || stage !== oldThreadData[0].stage || progress !== oldThreadData[0].progress) {
            await alertCCStatus(thread.thread_id, stage, progress, gen, tier, client);
        }
        else {
            return;
        }

        // update the db
        // if done, delete the row so we don't clog up the db
        if (stage === 'Done') {
            await pool.query('DELETE FROM chatot.cc_status WHERE thread_id=$1', [thread.thread_id]);
        }
        // otherwise, upsert the row with the new values
        else {
            await pool.query('INSERT INTO chatot.cc_status (thread_id, stage, progress) VALUES ($1, $2, $3) ON CONFLICT (thread_id) DO UPDATE SET stage=$2, progress=$3', [thread.thread_id, stage, progress]);
        }
        

    }

}


export function validateCCTier(tier: string) {
    // make sure what they entered is a valid entry
    const valid = ccMetaObj.some(pair => pair.value === tier.toLowerCase());
    return valid;
}


async function alertCCStatus(threadid: number, stage: string, progress: string, gen: string, tier: string, client: Client) {
    // select by gen and tier
    // then alert progress

    // get the discord channels setup to receive alerts
    const alertChansPG = await pool.query('SELECT serverid, channelid, role FROM chatot.ccprefs WHERE tier=$1 AND gen=$2', [tier, gen]);
    const alertChans: { serverid: string, channelid: string, role: string }[] | [] = alertChansPG.rows;

    // if there are no channels setup to receive QC 
    if (!alertChans.length) {
        return;
    }

    // fetch the channel so we can post to it
    for (const alertChan of alertChans) {
        const chan = await client.channels.fetch(alertChan.channelid);

        // typecheck chan
        if (!chan || !(chan.type === ChannelType.GuildText || chan.type === ChannelType.PublicThread || chan.type === ChannelType.PrivateThread)) {
            return;
        }
        // post
        await chan.send(`Update to thread <https://www.smogon.com/forums/threads/${threadid}/>\n\nStatus: ${stage} ${progress}`);
        return;
    }
}