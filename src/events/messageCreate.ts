import { Message, MessageType } from 'discord.js';
import { eventHandler } from '../types/event-base';
import { rmtMonitor } from '../helpers/rmt-monitor.js';
import { dbmatches } from '../helpers/manageCustomsCache.js';
/**
 * messageCreate handler
 *
 * On message, this checks whether the contents is something the bot needs to act on.
 *
 * This triggers on each message, so the once parameter is left out (alternatively could be set to false)
 */

export const clientEvent: eventHandler = {
    // define the name of the trigger event
    name: 'messageCreate',
    // execute the command
    async execute(msg: Message) {
        // if the message is a bot or in a DM, ignore it
        // unless it is a "chatot pinned" message, then you can delete it to clean up
        if (!msg.guild) {
            return;
        }
        else if (msg.author.bot && msg.type === MessageType.ChannelPinnedMessage) {
            await msg.delete();
            return;
        }
        else if (msg.author.bot) {
            return;
        }
        
        // check for custom commands
        const serverid = msg.guildId;
        // get the list of prefixes for this server
        const serverRows = dbmatches.filter(row => row.serverid === serverid);
        const serverCommands = serverRows.map(r => `${r.prefix}${r.cmd}`);

        if (serverCommands.some(cmd => msg.content === cmd)) {
            // find the index in the server commands
            const index = serverCommands.findIndex(cmd => cmd === msg.content);
            // post the message
            await msg.channel.send(serverRows[index].txt);
            return;
        }
        
        // check for RMT ping
        await rmtMonitor(msg);

        // fun
        const replyText = [
            'thank you chatot',
            'ty chatot',
            'thanks chatot',
        ];

        if (replyText.includes(msg.content.toLowerCase())) {
            await msg.channel.send(`you're welcome ${msg.author.displayName} <3`);
            return;
        }
    },
};