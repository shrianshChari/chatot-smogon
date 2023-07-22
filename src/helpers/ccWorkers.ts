/**
 * Functions related to C&C integration
 */
import { ccTimeInterval, ccSubObj, OMPrefix, pastGenPrefix, rbyOtherPrefix, gens } from './constants.js';
import { ChannelType, Client } from 'discord.js';
import { loadCCData, updateLastCheck, pollCCForums, updateCCCache } from './ccQueries.js';
import { IParsedThreadData, ICCData, IXFStatusQuery } from '../types/cc';


/**
 * Finds new and updated C&C threads posted to the relevent subforums.
 * New thread ids are cached so their progress is tracked,
 * and alerts are sent to the relevant discord channels
 * @param client discord js client object
 */
export async function checkCCUpdates(client: Client) {
    // poll the database of cached cc threads, last check timestamp, and current alert chans
    const oldData = await loadCCData();

    // unpack the data we need
    const oldThreadIds = oldData.threads.map(thread => thread.thread_id);
    
    let lastCheckUnix = 0;
    const now = Date.now();

    // if you found a match in the table
    // use that as the last check time, converted to UNIX format so it can be used to query the forum table
    if (oldData.lastcheck) {
        const lastCheckDate = new Date(oldData.lastcheck).valueOf();
        lastCheckUnix = Math.floor(lastCheckDate / 1000);
    }
    // if you didn't get a match, assume the last check was the current time minus the interval (boot time)
    else {
        lastCheckUnix = Math.floor(now / 1000 - ccTimeInterval);
    }

    // poll the xf tables to get the thread data we care about
    const threadData = await pollCCForums(lastCheckUnix, oldThreadIds);
    
    // if you didn't get a match, there's nothing to do
    // so update the check time and return
    if (!threadData.length) {
        await updateLastCheck(now);
        return;
    }

    // parse the fetched thread info and check for changes, alerting on discord if necessary
    const parsedThreadData = parseCCStage(threadData);

    // loop over the list of threads and update discord/the cache if they're updated/new
    for (const newThreadData of parsedThreadData) {
        // first, determine whether this thread was previously cached
        const oldThreadData = oldData.threads.filter(othread => othread.thread_id === newThreadData.thread_id);
        // if there's a change or it's new, try to alert on discord
        if (!oldThreadData.length || newThreadData.stage !== oldThreadData[0].stage || newThreadData.progress !== oldThreadData[0].progress) {
            await alertCCStatus(newThreadData, oldData, client);
        }
        // otherwise, there's nothing to update, so skip over this thread
        else {
            continue;
        }

        // update the db of cached statuses
        await updateCCCache(newThreadData);
    }

    // everything's done, so update the last checked time
    // we use the time this command was triggered rather than the time it finished since processing is non-zero.
    await updateLastCheck(now);
}


/**
 * Posts an update to the relevant discord channel
 * @param newData Object containing the parsed thread information regarding its C&C status
 * @param oldData Object containing the result of the PG query, including json of the cached old data, last check timestamp, and json of alert channels
 * @param client Discord js client object
 */
async function alertCCStatus(newData: IParsedThreadData, oldData: ICCData, client: Client) {
    // to be safe, cast each element in the tier array to lower case
    const newTierLower = newData.tier.map(tier => tier.toLowerCase());

    // check if there are any channels setup to receive alerts for this thread
    const alertChans = oldData.alertchans.filter(chanData => newTierLower.includes(chanData.tier) && newData.gen.includes(chanData.gen));

    // if there are no channels setup to receive this update, return
    if (!alertChans.length) {
        return;
    }

    // store the list of processed channel ids so we don't alert each one multiple times
    const processedIDs: string[] = [];

    // fetch the channel so we can post to it
    for (const alertChan of alertChans) {
        if (processedIDs.includes(alertChan.channelid)) {
            continue;
        }

        const chan = await client.channels.fetch(alertChan.channelid);

        // typecheck chan
        if (!chan || !(chan.type === ChannelType.GuildText || chan.type === ChannelType.PublicThread || chan.type === ChannelType.PrivateThread)) {
            return;
        }
        // post
        // we only want to post for QC updates and done
        let alertmsg = '';
        if (newData.stage === 'GP' && newData.progress.startsWith('0')) {
            alertmsg = `Update to thread <https://www.smogon.com/forums/threads/${newData.thread_id}/>\nStatus: **Ready for GP**`;
        }
        else if (newData.stage === 'QC' && newData.progress.startsWith('0')) {
            alertmsg = `Update to thread <https://www.smogon.com/forums/threads/${newData.thread_id}/>\nStatus: **Ready for QC**`;
        }
        else if (!(newData.stage === 'QC' || newData.stage === 'Done')) {
            return;
        }
        else {
            alertmsg = `Update to thread <https://www.smogon.com/forums/threads/${newData.thread_id}/>\nStatus: **${newData.stage} ${newData.progress}**`;
        }

        // prepend with a ping on the role, if desired
        if (alertChan.role) {
            alertmsg = `<@&${alertChan.role}> `.concat(alertmsg);
        }

        await chan.send(alertmsg);
        processedIDs.push(alertChan.channelid);
    }
}


/**
 * Parses the thread titles and prefixes to determine its C&C stage and progress.
 * Returned information includes thread id, node id, title, prefix text, stage, progress, gen, and tier
 * @param threadData Array of objects containing the thread information retrieved from the db query
 * @returns Parsed data array of objects for each thread indiciating the C&C stage and progress
 */
export function parseCCStage(threadData: IXFStatusQuery[]) {
    const parsedThreadData: IParsedThreadData[] = [];
    
    // loop over the list of provided threads to figure out the state of each
    for (const thread of threadData) {
        // first, try to parse the prefix text, because that will work for most cases
        // we care about: QC ready (tag changed to QC), QC progress, and done
        let stage = '';
        let progress = '';
        let gen: string[] = [];
        let tier: string[] = [];

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
        else if (thread.phrase_text && OMPrefix.includes(thread.phrase_text)) {
            tier = [thread.phrase_text];
        }
        // past gens
        else if (thread.phrase_text && pastGenPrefix.includes(thread.phrase_text)) {
            const genRE = thread.phrase_text.match(/(?<=Gen )\d/);
            if (genRE) {
                gen = [genRE[0]];
            }
        }
        // rby other
        else if (thread.phrase_text && rbyOtherPrefix.includes(thread.phrase_text)) {
            tier = [thread.phrase_text];
        }
        
        // determine the stage if we haven't already
        if (stage === '') {
            // regex match results in [match, 'qc/gp', '0/1'][] format
            const progressions = [...thread.title.matchAll(/(QC|GP).{0,3}(\d\s?\/\s?\d)/gi)];
            
            // general progression is WIP, QC, GP, done
            if (!progressions.length) {
                stage = 'WIP';
            }
            else if (thread.title.toLowerCase().includes('done')) {
                stage = 'Done';
            }
            // if you match both, you have to parse each to see what stage you're really in
            else if (progressions.length >= 2) {
                // figure out the progress for each stage that was matched
                // we have to check for both QC and GP because some people might prefill the entries but not have values
                const gpStageMatch = progressions.filter(prog => prog.some(val => val?.toLowerCase() === 'gp'));

                // if the regex failed, just return to be safe
                if (!gpStageMatch.length || gpStageMatch[0].length < 3) {
                    continue;
                }

                const gpStageProgress = gpStageMatch[0][2].replace(/ /g, '');
                // split the progress on / so we can analyze the progression
                const gpProgArr = gpStageProgress.split('/');

                const qcStageMatch = progressions.filter(prog => prog.some(val => val?.toLowerCase() === 'qc'));

                // if the regex failed, just return to be safe
                if (!qcStageMatch.length || qcStageMatch[0].length < 3) {
                    continue;
                }

                const qcStageProgress = qcStageMatch[0][2].replace(/ /g, '');
                // split the progress on / so we can analyze the progression
                const qcProgArr = qcStageProgress.split('/');
                
                // if the qc progress isn't complete, it's in QC
                if (qcProgArr[0] !== qcProgArr[1]) {
                    stage = 'QC';
                    progress = qcStageProgress;
                }
                // if GP and QC are both complete, it's done
                else if (qcProgArr[0] === qcProgArr[1] && gpProgArr[0] === gpProgArr[1]) {
                    stage = 'Done';
                }
                // if QC is complete and GP isn't, it's in GP
                else {
                    stage = 'GP';
                    progress = gpStageProgress;
                }
            }
            // match gp only
            else if (progressions.some(prog => prog.some(val => val?.toLowerCase() === 'gp'))) {
                const gpStageMatch = progressions.filter(prog => prog.some(val => val?.toLowerCase() === 'gp'));
                const gpStageProgress = gpStageMatch[0][2].replace(/ /g, '');
                // split the progress on / so we can analyze the progression
                const gpProgArr = gpStageProgress.split('/');

                // if both sides of the / are the same, up the stage by 1
                if (gpProgArr[0] === gpProgArr[1]) {
                    stage = 'Done';
                }
                // otherwise, we're still in GP
                else {
                    stage = 'GP';
                    progress = gpStageProgress;
                }
                
            }
            // match qc only
            else if (progressions.some(prog => prog.some(val => val?.toLowerCase() === 'qc'))) {
                const qcStageMatch = progressions.filter(prog => prog.some(val => val?.toLowerCase() === 'qc'));
                const qcStageProgress = qcStageMatch[0][2].replace(/ /g, '');
                
                // split the progress on / so we can analyze the progression
                const qcProgArr = qcStageProgress.split('/');

                // if both sides of the / are the same, up the stage by 1
                if (qcProgArr[0] === qcProgArr[1]) {
                    stage = 'GP';
                    progress = '0/?';
                }
                // otherwise, we're still in QC
                else {
                    stage = 'QC';
                    progress = qcStageProgress;
                }
            }
            // if nothing, assume it's wip
            else {
                stage = 'WIP';
            }
        }

        // determine the progress if we haven't already
        if (progress === '') {
            const progressions = [...thread.title.matchAll(/(QC|GP).{0,3}(\d\s?\/\s?\d)/gi)];
            
            // if you found a match from the regex, try to find the entry corresponding to the tag
            if (stage === 'GP' || stage === 'QC') {
                let stageProgress = progressions.filter(prog => prog.some(val => val?.toLowerCase() === stage.toLowerCase()));
                // if you found one, a match, then use the match's progress
                if (stageProgress.length && stageProgress[0].length >= 3) {
                    progress = stageProgress[0][2].replace(/ /g, '');
                }
                // if you didn't find a match, it's possible they didn't enter the name of the stage into the title because it's implied by the tag
                // so use the progress of the match that doesn't have text
                else if (progressions.length) {
                    stageProgress = progressions.filter(prog => prog[1] === undefined && prog[2]);
                    if (stageProgress.length && stageProgress[0].length >= 3) {
                        progress = stageProgress[0][2].replace(/ /g, '');
                    }
                    
                }
            }

        }

        
        // determine the gen if we haven't already
        // past gen OMs are special in that we also have to get the gen from the title
        // everywhere else(?) is determined by either the thread location or prefix
        if (!gen.length) {
            // old gen OMs
            if (thread.node_id === 770) {
                // try to find the gen from the title
                const genRegex = /\b((Gen|G|Generation)\s*([1-9])|(SV|SWSH|SS|USUM|USM|SM|ORAS|XY|B2W2|BW2|BW|HGSS|DPP|DP|RSE|RS|ADV|GSC|GS|RBY|RB))*\b/i;
                const matchArr = thread.title.match(genRegex);

                // if there was a match from the regex test...
                if (matchArr !== null && matchArr[0] !== '') {
                    const genDesr = (matchArr[3] || matchArr[4]).toLowerCase();
                    gen = [gens[genDesr]];
                }
                // else, no gen was specified, give up
                else {
                    continue;
                }
            }
            // otherwise get the gen from the thread map
            else {
                gen = ccSubObj[thread.node_id.toString()].gens;
            }
        }

        // get the tier from the thread map, if we haven't already
        if (!tier.length) {
            tier = ccSubObj[thread.node_id.toString()].tiers;
        }

       
        // push the data to the holding array
        parsedThreadData.push({
            thread_id: thread.thread_id,
            node_id: thread.node_id,
            title: thread.title,
            phrase_text: thread.phrase_text,
            gen: gen,
            tier: tier,
            stage: stage,
            progress: progress,
        });
    }
    return parsedThreadData;
}