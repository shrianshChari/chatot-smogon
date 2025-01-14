import { EmbedBuilder, Guild, ChannelType, User, Message } from 'discord.js';
import { pool } from './createPool.js';
import { errorHandler } from './errorHandler.js';

/**
 * Group of functions helpful for logging 
 */

// interfact for embed field array
export interface embedField {
    name: string,
    value: string,
    inline?: boolean,
}

/**
 * Builds a discord embed for logging
 * @param title Title field of the embed
 * @param desc Description field for the embed
 * @param options Optional object containing the color and fields to use for the embed
 * @returns embedBuilder
 */
export function buildEmbed(title: string, options?: { description?: string, color?: number, fields?: embedField[] }) {
    const embed = new EmbedBuilder()
        .setTitle(title);
    
    if (options?.description) {
        embed.setDescription(options.description);
    }

    if (options?.color) {
        embed.setColor(options.color);
    }

    if (options?.fields) {
        embed.addFields(options.fields);
    }

   return embed;
}


export enum loggedEventTypes {
    Ban = 'ban',
    Kick = 'kick',
    Timeout = 'timeout',
    ModDelete = 'moddelete',
    SelfDelete = 'selfdelete',
    Edit = 'edit',
    Boost = 'boost',
}

/**
 * Logs to the log chan, if it exists
 */
export interface ILogChan {
    channelid: string,
    logtype: string,
}
export async function postLogEvent(ogEmbed: EmbedBuilder, guild: Guild, event: loggedEventTypes, message?: Message) {
    // see if logging is enabled in the server
    const pgres = await pool.query('SELECT channelid, logtype FROM chatot.logchan WHERE serverid=$1', [guild.id]);
    const logchan: ILogChan[] | [] = pgres.rows;

    if (logchan.length) {
        // try to find the channel with the type corresponding to the event type
        /*
        all - ban, kick, TO, mod delete, self delete, edit, boost
        edits - edit
        nonedits - ban, kick, TO, mod delete, self delete, boost
        userex - self deletes, edits, boost
        modex - kick, ban TO, mod delete
        usertarget - kick, ban, TO, boost
        msgtarget - mod delete, self delete, edit
        */
        let targetChans: ILogChan[] = [];
        if (event === loggedEventTypes.Ban || event === loggedEventTypes.Kick || event === loggedEventTypes.Timeout) {
            targetChans = logchan.filter(row => ['all', 'nonedits', 'modex', 'usertarget'].includes(row.logtype));
        }
        else if (event === loggedEventTypes.ModDelete) {
            targetChans = logchan.filter(row => ['all', 'nonedits', 'modex', 'msgtarget'].includes(row.logtype));
        }
        else if (event === loggedEventTypes.SelfDelete) {
            targetChans = logchan.filter(row => ['all', 'nonedits', 'userex', 'msgtarget'].includes(row.logtype));
        }
        else if (event === loggedEventTypes.Edit) {
            targetChans = logchan.filter(row => ['all', 'edits', 'userex', 'msgtarget'].includes(row.logtype));
        }
        else if (event === loggedEventTypes.Boost) {
            targetChans = logchan.filter(row => ['all', 'nonedits', 'userex', 'usertarget'].includes(row.logtype));
        }

        // loop over the list of relevant channels
        // there'll only be 1, but technically there could be more
        for (const chan of targetChans) {
            try {
                // clone the embed so that we keep the original as a reference in case there are multiple log chans in a server
                const embed = EmbedBuilder.from(ogEmbed);

                const channel = guild.client.channels.cache.get(chan.channelid);
                if (!(channel?.type === ChannelType.GuildText || channel?.type === ChannelType.PublicThread || channel?.type === ChannelType.PrivateThread)) {
                    continue;
                }
                // special logic for message deletes
                // we didn't build the attachment filed before becuase we want to preview embeds
                if (message) {
                    // echo any attachments in another post
                    if (message.attachments.size > 0) {
                        const attachmentArr = [...message.attachments.values()];
                        // loop over all of the attachments and build an embed for each one so they preview
                        let attCnt = 0;
                        let postCnt = 0;
                        // set the max number of images per embed
                        // the max that can be previewed is 4
                        // any more are embeded, but you need to scroll thru the images to see them.
                        const maxImages = 4;
                        let embedHolder: EmbedBuilder[] = [];

                        for (const attachment of attachmentArr) {
                            const attPreviewEmbed = EmbedBuilder.from(embed).setURL('https://www.smogon.com/forums/').setImage(attachment.url);
                            embedHolder.push(attPreviewEmbed);
                            attCnt++;
                            // set a cap for the number of images allowed in each embed
                            // then reset the holder
                            if (attCnt === maxImages) {
                                // build the embed attachment list
                                embedHolder.forEach((newEmbed, index) => {
                                    embedHolder[index] = newEmbed.addFields(
                                        { name: 'Attachments', value: attachmentArr.slice(maxImages * postCnt, maxImages * (postCnt + 1)).map(att => att.url).join(' ') },
                                    );
                                });

                                // post it 
                                await channel.send({ embeds: embedHolder });
                                // increment the post counter
                                postCnt++;                    
                                // reset the holder and attachment counter
                                embedHolder = [];
                                attCnt = 0;
                            }
                        }
                        // if there are still pending embeds in the holder, we need to post them
                        if (embedHolder.length) {
                            // build the attachment list
                            embedHolder.forEach((newEmbed, index) => {
                                embedHolder[index] = newEmbed.addFields(
                                    { name: 'Attachments', value: attachmentArr.slice(maxImages * postCnt).map(att => att.url).join(' ') },
                                );
                            });
                                
                            await channel.send({ embeds: embedHolder });
                        }
                    }
                    else {
                        embed.addFields(
                            { name: 'Attachments', value: 'No Attachments' },
                        );
                        await channel.send({ embeds: [embed] });
                    }
                }
                else {
                    await channel.send({ embeds: [embed] });
                }
            }
            catch (e) {
                errorHandler(e);
                continue;
            }
            
        }
        
    }
}


/**
 * Main discord uses a separate channel to specifically log punishments.
 * If this action occurred in main, echo to that channel as well.
 */
export async function echoPunishment(guild: Guild, target: User, reason: string, punishment: string) {
    if (guild.id === '192713314399289344') {
        // get the log-punishements channel
        const punishChan = guild.client.channels.cache.get('768187740956917821');
        // typecheck to make TS happy
        if (punishChan?.type !== ChannelType.GuildText) {
            return;
        }
        // echo to the other chan
        await punishChan.send(`${target.id} / ${target.tag} / ${punishment} / ${reason}`);
    }
}


/**
 * Builds a discord embed to log the mod action.
 * @param executor User who deleted the message
 * @param message Message that was deleted
 * @returns Array containing the embed title, descr, color, and fields
 */
export function buildMsgDeleteEmbedParams(executor: User | string, message: Message): [string, string, number, embedField[]] {
    // set the embed title
    const title = 'Message Deleted';

    // set the embed description
    let description = '';
    if (executor === 'Self') {
        description = `${message.author.tag} deleted their own message.`;
    }
    else if (executor instanceof User) {
        description = `${message.author.tag}'s message was deleted by ${executor.tag}.`;
    }

    // set the embed color
    const color = 0x0099FF;


    // build the embed fields
    // if the executor is a User type, that means we found an audit log entry
    // we only care about their id, so grab that.
    // Otherwise output the string we passed
    let executorOut = '';

    if (executor instanceof User) {
        executorOut = `<@${executor.id}>`;
    }
    else {
        executorOut = executor;
    }

    // make sure the content isn't too long
    let contentFieldVal = '';
    if (message.content) {
        if (message.content.length > 1024) {
            contentFieldVal = 'Message too long to output.';
        }
        else {
            contentFieldVal = message.content;
        }
    }
    else {
        contentFieldVal = 'No text';
    }

    const fields = [
        { name: 'Content', value: `${contentFieldVal}` },
        { name: 'Author', value: `<@${message.author.id}>`, inline: true },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        { name: 'Deleted By', value: `${executorOut}` },
    ];

    return [title, description, color, fields];
}
