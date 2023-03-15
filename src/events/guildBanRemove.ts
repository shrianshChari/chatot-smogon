import { AuditLogEvent, GuildBan, EmbedBuilder, User, ChannelType } from 'discord.js';
import { eventHandler } from '../types/event-base';
import { sleep } from '../helpers/sleep.js';
import { pool } from '../helpers/createPool.js';
/**
 * Ban handler
 *
 * Event handler for when a user is unbanned.
 * Ban events are logged with the user, the mod, and the reason to the specified channel in the config file.
 * Content information is supplied by the audit log.
 *
 * Note that there is no guarantee when the audit log is populated, nor an event when it is.
 * If the person who deleted the message is a bot or the author, no audit log event is created.
 */

export const clientEvent: eventHandler = {
    // define the name of the trigger event
    name: 'guildBanRemove',
    // execute the code for this event
    async execute(ban: GuildBan) {
        // ignore DMs
        if (!ban.guild) {
            return;
        }

        // wrap the execution in a try/catch so that errors are handled and won't cause the bot to crash
        // wait a bit for the audit log to populate
        await sleep(10000);

        // since we're only banning 1 user at a time, fetch the latest event from the audit log of type ban
        const fetchedLogs = await ban.guild.fetchAuditLogs({
            limit: 20,
            type: AuditLogEvent.MemberBanRemove,
        });

        // filter out only the entries for this banned user
        fetchedLogs.entries.sweep(entry => entry.target?.id !== ban.user.id);
        // get the most recent one
        const banLog = fetchedLogs.entries.first();

        // If there's nothing in the audit log, output what we can
        if (!banLog) {
            await buildEmbed('Inconclusive. No audit log entry at this time', null, ban);
            return;
        }

        // Now grab the user object of the person who banned the member
        // Also grab the target of this action to double-check things
        const { executor, target, reason } = banLog;

        // make sure executor and target isn't null to make TS happy. It shouldn't be
        if (!executor || !target) {
            await buildEmbed('Inconclusive. No audit log entry at this time.', null, ban);
            return;
        }

        // Update the output with a bit more information
        // Also run a check to make sure that the log returned was for the same banned member
        if (target.id === ban.user.id) {
            await buildEmbed(executor, reason, ban);
        }
        else {
            await buildEmbed('Inconclusive. No audit log entry at this time.', null, ban);
            return;
        }

    },
};


/**
 * Builds discord embed for ban logging
 * @param executor User who initiated the ban
 * @param reason Provided reason for the ban
 * @returns void. Posts embed to log channel
 */
async function buildEmbed(executor: User | string, reason: string | null, ban: GuildBan) {
    // if the executor is a User type, that means we found an audit log entry
    // we only care about their id, so grab that.
    // Otherwise output the string we passed
    let executorOut = '';
    let executorName = '';
    let executorID = '';
    if (executor instanceof User) {
        executorOut = `<@${executor.id}>`;
        executorName = executor.tag;
        executorID = executor.id;
    }
    else {
        executorOut = executor;
        executorName = 'Unknown';
        executorID = 'N/A';
    }

    // typecheck reason
    if (reason === null) {
        reason = 'N/A';
    }
    // build the embed for output
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('User Unbanned')
        .setDescription(`${ban.user.tag} was unbanned from the server by ${executorName}.`)
        .addFields(
            { name: 'User', value: `<@${ban.user.id}>` },
            { name: 'Unbanned by', value: `${executorOut}` },
            { name: 'Reason', value: `${reason}` },
        );

    
    // save to modlog for the server
    await pool.query('INSERT INTO chatot.modlog (serverid, executor, target, action, reason) VALUES ($1, $2, $3, $4, $5)', [ban.guild.id, executorID, ban.user.id, 'Unban', reason]);

    // log to the logging channel, if it exists
    const pgres = await pool.query('SELECT channelid FROM chatot.logchan WHERE serverid=$1', [ban.guild.id]);
    const logchan: { channelid: string }[] | [] = pgres.rows;

    if (logchan.length) {
        const channel = ban.client.channels.cache.get(logchan[0].channelid);
        if (channel?.type !== ChannelType.GuildText) {
            return;
        }
        await channel.send({ embeds: [embed] });
    }
    else {
        return;
    }
}
