import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    ChannelType,
    AutocompleteInteraction,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
 } from 'discord.js';
import { SlashCommand } from '../types/slash-command-base';
import { pool } from '../helpers/createPool.js';
import { getRandInt } from '../helpers/getRandInt.js';
import { checkChanPerms } from '../helpers/checkChanPerms.js';
import { toAlias, validateAutocomplete, toGenAlias, filterAutocomplete } from '../helpers/autocomplete.js';
import { modifiedDexFormats, dexGens } from '../helpers/loadDex.js';


/**
 * Command for configuring multiple aspects of the bot
 * 
 */
export const command: SlashCommand = {
    global: true,
    guilds: [],
    // setup the slash command builder
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Sets up the requirements for a user to be considered verified')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)

        /**
         * VERIFY MEMBERS
         */
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('verify')
            .setDescription('Configures the server verification requirements')
            .addRoleOption(option => 
                option.setName('role')
                .setDescription('Role given to or removed from verified users')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('method')
                .setDescription('Upon verification, this role is...')
                .addChoices(
                    { name: 'Added', value: 'add' },
                    { name: 'Removed', value: 'remove' },
                )
                .setRequired(true))
            .addIntegerOption(option =>
                option.setName('accountage')
                .setDescription('Minimum account age in days')
                .setMinValue(0)
                .setMaxValue(2147483647)
                .setRequired(false))
            .addBooleanOption(option =>
                option.setName('turnoff')
                .setDescription('Turns off the verification process')
                .setRequired(false)))
        

        /**
         * LOGGING
         */
        .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
            .setName('logging')
            .setDescription('Configures server logging')
            .addSubcommand(new SlashCommandSubcommandBuilder()
                .setName('scope')
                .setDescription('Configures whether certain locations or actions are ignored')
                .addChannelOption(option => 
                    option.setName('ignore')
                        .setDescription('Turns off deleted and edit message tracking from the specified channel')
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('unignore')
                        .setDescription('Restores message tracking in the specified channel')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('deletions')
                        .setDescription('Messages will be logged if deleted by...')
                        .setChoices(
                            { name: 'Mods', value: 'mod' },
                            { name: 'Everyone', value: 'all' },
                        )
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('edits')
                        .setDescription('Configure whether to track message edits')
                        .setRequired(false)))
            .addSubcommand(new SlashCommandSubcommandBuilder()
                .setName('chantype')
                .setDescription('Configures the log channel type. See wiki for details')
                .addChannelOption(option =>
                    option.setName('channel')
                    .setDescription('The log channel to modify')
                    .setRequired(true)
                    .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread))
                .addStringOption(option =>
                    option.setName('type')
                    .setDescription('What gets logged into the channel')
                    .setChoices(
                        // everything
                        { name: 'All', value: 'all' },
                        // only edits
                        { name: 'Edits', value: 'edits' },
                        // everything but edits
                        { name: 'Non-Edits', value: 'nonedits' },
                        // user executed (self deletes, edits, boost)
                        { name: 'User Executed', value: 'userex' },
                        // mod executed (kick, ban, TO, mod delete)
                        { name: 'Mod Executed', value: 'modex' },
                        // user targeted (kick, ban, TO, boost)
                        { name: 'User Targeted', value: 'usertarget' },
                        // message targeted (delete, edit)
                        { name: 'Message Targeted', value: 'msgtarget' },
                    )
                    .setRequired(true))),
            )
        
        /**
         * DEX
         */
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('dex')
            .setDescription('Sets the default format for the /dex command. Defaults are automatically appended.')
            .addStringOption(option =>
                option.setName('format')
                .setDescription('Which format to automatically link to when using /dex. i.e. ou, uu, lc, doubles')
                .setAutocomplete(true)
                .setRequired(false))
            .addStringOption(option =>
                option.setName('gen')
                .setDescription('Which gen to automatically link to when using /dex. i.e. rb, ss, sv')
                .setAutocomplete(true)
                .setRequired(false)))
                
        /**
         * C&C
         */
        .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
                .setName('cc')
                .setDescription('Configures where to log C&C thread status updates')
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('add')
                    .setDescription('Sets up a channel to receive C&C thread status updates')
                    .addChannelOption(option =>
                        option.setName('channel')
                        .setDescription('The channel to which C&C thread status updates are posted')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread))
                    .addStringOption(option =>
                        option.setName('tier')
                        .setDescription('The tier to monitor C&C thread status updates for')
                        .setAutocomplete(true)
                        .setRequired(true))
                    .addStringOption(option =>
                        option.setName('gen')
                        .setDescription('The gen to monitor C&C thread status updates for')
                        .setAutocomplete(true)
                        .setRequired(true))
                    .addRoleOption(option =>
                        option.setName('role')
                        .setDescription('The role to ping')
                        .setRequired(false))
                    .addStringOption(option =>
                        option.setName('stage')
                        .setDescription('The stage in the C&C progress the role pings for. Default: All')
                        .setChoices(
                            { name: 'All', value: 'all' },
                            { name: 'QC Ready/Progress', value: 'qc' },
                            { name: 'Done', value: 'done' },
                        )
                        .setRequired(false))
                    .addIntegerOption(option =>
                        option.setName('cooldown')
                        .setDescription('The minimum number of hours between QC progress alerts. Default: 0; max: 12')
                        .setMinValue(0)
                        .setMaxValue(12)
                        .setRequired(false))
                    .addStringOption(option =>
                        option.setName('tierprefix')
                        .setDescription('Non-stage thread prefix used by your monitored tier (i.e. in OMs, Old Gens, RBY Other)')
                        .setRequired(false)))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('remove')
                    .setDescription('Stops tracking the provided tier from the specified channel')
                    .addChannelOption(option =>
                        option.setName('channel')
                        .setDescription('The channel you want to modify tracking alerts for')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread))
                    .addStringOption(option =>
                        option.setName('tier')
                        .setDescription('The tier to stop monitoring C&C thread status updates for')
                        .setAutocomplete(true)
                        .setRequired(true))
                    .addStringOption(option =>
                        option.setName('gen')
                        .setDescription('The gen to monitor C&C thread status updates for')
                        .setAutocomplete(true)
                        .setRequired(true)))
                .addSubcommand(new SlashCommandSubcommandBuilder()
                    .setName('removeall')
                    .setDescription('Removes all C&C tracking from the server')))
        
                
        /**
         * TICKETS
         */
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('tickets')
            .setDescription('Initializes a button for users to submit a help ticket to server staff')
            .addChannelOption(option =>
                option.setName('threadchan')
                .setDescription('The top-level channel for the private threads and button')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
            .addChannelOption(option =>
                option.setName('logchan')
                .setDescription('The channel to which new thread alerts are logged')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread))
            .addRoleOption(option =>
                option.setName('staff')
                .setDescription('The staff role that can access the ticket')
                .setRequired(false))
            .addRoleOption(option =>
                option.setName('staff2')
                .setDescription('Additional staff role that can access the ticket')
                .setRequired(false))
            .addRoleOption(option =>
                option.setName('staff3')
                .setDescription('Additional staff role that can access the ticket')
                .setRequired(false))),

    // prompt the user with autocomplete options since there are too many tiers to have a selectable list
    async autocomplete(interaction: AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'tier' || focusedOption.name === 'format') {
            await filterAutocomplete(interaction, focusedOption, modifiedDexFormats);
        }
        else if (focusedOption.name === 'gen') {
            await filterAutocomplete(interaction, focusedOption, dexGens);
        }

    },
    
    // execute our desired task
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.guildId) {
            return;
        }

        /**
         * VERIFY
         */

        if (interaction.options.getSubcommand() === 'verify') {
            // retrieve the user input
            const role = interaction.options.getRole('role', true);
            const method = interaction.options.getString('method', true);
            const age = interaction.options.getInteger('accountage') ?? 0;
            const turnoff = interaction.options.getBoolean('turnoff');

            // make sure it's a valid assignable role
            // invalid are the built-in @everyone role and any role that's externally managed (i.e. bot role, boost role)
            if (role.managed || role.name === '@everyone') {
                await interaction.followUp('I cannot assign that role');
                return;
            }

            // upsert into the db
            if (turnoff) {
                await pool.query('DELETE FROM chatot.verifyreqs WHERE serverid=$1', [interaction.guildId]);
                // success!
                await interaction.followUp('Ok, I will no longer assign a role to new members');
            }
            else {
                await pool.query('INSERT INTO chatot.verifyreqs (serverid, roleid, age, method) VALUES ($1, $2, $3, $4) ON CONFLICT (serverid) DO UPDATE SET serverid=EXCLUDED.serverid, roleid=EXCLUDED.roleid, age=EXCLUDED.age, method=EXCLUDED.method', [interaction.guildId, role.id, age, method]);
                // success!
                await interaction.followUp(`Ok, I will **${method}** role **${role.name}** on new members with a forum account older than **${age}** days.`);
            }
            return;
        }


        /**
         * LOGGING SCOPE
         */
        else if (interaction.options.getSubcommand() === 'scope') {
            // get the user input
            const ignoreChan = interaction.options.getChannel('ignore');
            const unignoreChan = interaction.options.getChannel('unignore');
            let del = interaction.options.getString('deletions');
            let edits = interaction.options.getBoolean('edits');

            // make sure they didn't enter the same chan for ignore and unignore
            if (ignoreChan && unignoreChan) {
                if (ignoreChan.id === unignoreChan.id) {
                    await interaction.followUp('Ignore and unignore channels cannot be the same');
                    return;
                }
            }

            // make sure they entered something
            if (!ignoreChan && !unignoreChan && !del && edits === null) {
                await interaction.followUp('No inputs provided. Nothing to update.');
                return;
            }

            // query the db so we can update the info if necessary
            const q = await pool.query('SELECT ignoreid, deletescope, logedits FROM chatot.logprefs WHERE serverid=$1', [interaction.guildId]);
            const storedVal: { ignoreid: string, deletescope: string, logedits: boolean }[] | [] = q.rows;

            // default delete preferences to mod scope if not provided and not previously stored
            if (!del && storedVal.length) {
                del = storedVal[0].deletescope;
            }
            else if (!del) {
                del = 'mod';
            }

            // similarly, default log edits to false if not provided and not previously stored
            if (edits === null && storedVal.length) {
                edits = storedVal[0].logedits;
            }
            else if (edits === null) {
                edits = false;
            }

            // query the pool with a transaction
            const pgClient = await pool.connect();
            let hadError = false;
            try {
                // start
                await pgClient.query('BEGIN');
                // delete
                await pgClient.query('DELETE FROM chatot.logprefs WHERE ignoreid=$1', [unignoreChan?.id]);
                // insert
                await pgClient.query('INSERT INTO chatot.logprefs (serverid, ignoreid, deletescope, logedits) VALUES ($1, $2, $3, $4) ON CONFLICT (serverid, ignoreid) DO NOTHING', [interaction.guildId, ignoreChan?.id ?? '0', del, edits]);
                // update
                await pgClient.query('UPDATE chatot.logprefs SET deletescope=$1, logedits=$2 WHERE serverid=$3', [del, edits, interaction.guildId]);
                // end
                await pgClient.query('COMMIT');
            }
            catch (e) {
                await pgClient.query('ROLLBACK');
                hadError = true;
                // if this errors we have bigger problems, so log it
                console.error(e);
                await interaction.followUp('An error occurred and your preferences were not saved');
            }
            finally {
                pgClient.release();
            }
            if (!hadError) {
                await interaction.followUp('Preferences updated');
            }
        }

        /**
         * LOGGING CHAN TYPE
         */
        else if (interaction.options.getSubcommand() === 'chantype') {
            // get the user input
            const chan = interaction.options.getChannel('channel', true, [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread]);
            const type = interaction.options.getString('type', true);

            // make sure they are actually logging in this channel.
            // if they aren't, return and tell them to enable it first
            const logchanPG = await pool.query('SELECT channelid FROM chatot.logchan WHERE serverid = $1', [interaction.guildId]);
            const logchans: { channelid: string }[] | [] = logchanPG.rows;

            if (!logchans.some(row => row.channelid === chan.id)) {
                await interaction.followUp('Logging is not currently set to the provided channel. Please enable logging with the `/logging enable` command first before setting preferences.');
                return;
            }

            // otherwise, update
            await pool.query('UPDATE chatot.logchan SET logtype = $1 WHERE channelid = $2', [type, chan.id]);

            // and tell them we updated their prefs
            await interaction.followUp('Log channel type updated');

        }

        /**
         * DEX DEFAULTS
         */

        else if (interaction.options.getSubcommand() === 'dex') {
            // get the inputs
            let format = interaction.options.getString('format') ?? '';
            let gen = interaction.options.getString('gen') ?? '';

            // map them to their aliases
            format = toAlias(format);
            gen = await toGenAlias(gen);

            if (format) {
                // validate the autocomplete entry
                // if it's not valid, return and let them know
                if (!validateAutocomplete(format, modifiedDexFormats)) {
                    await interaction.followUp('I did not understand that meta; please choose one from the list');
                    return;
                }
            }
            if (gen) {
                // validate the autocomplete entry
                // if it's not valid, return and let them know
                if (!validateAutocomplete(gen, dexGens)) {
                    await interaction.followUp('I did not understand that gen; please choose one from the list');
                    return;
                }
            }

            // upsert it into the table
            await pool.query('INSERT INTO chatot.dexdefaults (serverid, format, gen) VALUES ($1, $2, $3) ON CONFLICT (serverid) DO UPDATE SET format=EXCLUDED.format, gen=EXCLUDED.gen', [interaction.guildId, format.toLowerCase(), gen.toLowerCase()]);
            // let them know we updated it
            await interaction.followUp('Defaults set');
        }


        /**
         * C&C INTEGRATION
         */
        
        else if (interaction.options.getSubcommandGroup() === 'cc') {

            /**
             * ADD
             */

            if (interaction.options.getSubcommand() === 'add') {
                // get inputs
                const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread]);
                const tier = toAlias(interaction.options.getString('tier', true));
                const role = interaction.options.getRole('role');
                const gen = await toGenAlias(interaction.options.getString('gen', true));
                const stage = interaction.options.getString('stage') ?? 'all';
                const cooldown = interaction.options.getInteger('cooldown');
                const prefix = interaction.options.getString('tierprefix')?.toLowerCase();

                const standardPrefixes = [
                    'wip',
                    'resource',
                    'announcement',
                    'quality control',
                    'copyediting',
                    'done',
                    'project',
                ];

                // make sure they followed directions
                if (prefix && standardPrefixes.includes(prefix)) {
                    await interaction.followUp('The tierprefix field is used for prefixes that are used to determine which tier (or gen) you are referring to (like in OMs or Old Gens). You entered a C&C stage prefix. If your threads do not use prefixes other than those to track C&C progress, please leave this field blank.');
                    return;
                }

                // validate the autocomplete entry
                // if it's not valid, return and let them know
                if (!validateAutocomplete(tier, modifiedDexFormats)) {
                    await interaction.followUp('I did not understand that meta or I am not setup to track it. Please choose one from the list');
                    return;
                }

                if (!validateAutocomplete(gen, dexGens)) {
                    await interaction.followUp('I did not understand that gen. Please choose one from the list');
                    return;
                }

                // insert into the table
                if (stage === 'all') {
                    // query the pool with a transaction
                    const pgClient = await pool.connect();
                    try {
                        // start
                        await pgClient.query('BEGIN');
                        // delete -- delete everything because 'all' is incompat with the rest
                        await pgClient.query('DELETE FROM chatot.ccprefs WHERE serverid=$1 AND channelid=$2 AND tier=$3 AND gen=$4', [interaction.guildId, channel.id, tier, gen]);
                        // insert
                        await pgClient.query('INSERT INTO chatot.ccprefs (serverid, channelid, tier, role, gen, stage, cooldown, prefix) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [interaction.guildId, channel.id, tier, role?.id, gen, stage, cooldown, prefix]);
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
                    
                }
                else {
                    // query the pool with a transaction
                    const pgClient = await pool.connect();
                    try {
                        // start
                        await pgClient.query('BEGIN');
                        // delete -- delete the corresponding 'all' row
                        await pgClient.query('DELETE FROM chatot.ccprefs WHERE serverid=$1 AND channelid=$2 AND tier=$3 AND gen=$4 AND stage=$5', [interaction.guildId, channel.id, tier, gen, 'all']);
                        // upsert
                        await pgClient.query(`INSERT INTO chatot.ccprefs (serverid, channelid, tier, role, gen, stage, cooldown, prefix)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (serverid, channelid, tier, gen, stage) DO UPDATE
                            SET serverid=EXCLUDED.serverid, channelid=EXCLUDED.channelid, tier=EXCLUDED.tier, role=EXCLUDED.role, gen=EXCLUDED.gen, stage=EXCLUDED.stage, cooldown=EXCLUDED.cooldown, prefix=EXCLUDED.prefix`,
                            [interaction.guildId, channel.id, tier, role?.id, gen, stage, cooldown, prefix]);
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
                }

                // let them know we're done
                await interaction.followUp('Preferences updated');
            }

            /**
             * REMOVE
             */

            else if (interaction.options.getSubcommand() === 'remove') {
                // get inputs
                const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread]);
                const tier = toAlias(interaction.options.getString('tier', true));
                const gen = await toGenAlias(interaction.options.getString('gen', true));

                // validate the autocomplete entry
                // if it's not valid, return and let them know
                if (!validateAutocomplete(tier, modifiedDexFormats)) {
                    await interaction.followUp('I did not understand that meta or I am not setup to track it. Please choose one from the list');
                    return;
                }

                if (!validateAutocomplete(gen, dexGens)) {
                    await interaction.followUp('I did not understand that gen; please choose one from the list');
                    return;
                }


                // update the table
                await pool.query('DELETE FROM chatot.ccprefs WHERE serverid=$1 AND channelid=$2 AND tier=$3 AND gen=$4', [interaction.guildId, channel.id, tier, gen]);

                // done
                await interaction.followUp('Preferences updated');
            }

            /**
             * REMOVE ALL
             */

            else if (interaction.options.getSubcommand() === 'removeall') {
                // update the table
                await pool.query('DELETE FROM chatot.ccprefs WHERE serverid=$1', [interaction.guildId]);

                // done
                await interaction.followUp('Preferences updated');
            }
            
        }


        /**
         * TICKETS
         */
        else if (interaction.options.getSubcommand() === 'tickets') {
            // get inputs
            const threadChannel = interaction.options.getChannel('threadchan', true, [ChannelType.GuildText]);
            const staffRole = interaction.options.getRole('staff');
            const logchan = interaction.options.getChannel('logchan', false, [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread]);
            const staff2 = interaction.options.getRole('staff2');
            const staff3 = interaction.options.getRole('staff3');

            // create an array of the unique, non-null values
            let staffRoles = [staffRole, staff2, staff3].filter(role => role).map(role => role?.id);
            staffRoles = [...new Set(staffRoles)];

            // if they didn't specify any roles, enter a dummy value
            // this can't be null because it's part of the PK in the chatot.tickets schema
            if (!staffRoles.length) {
                staffRoles = ['-'];
            }
            
            // create a button for the users to click
            const embed = new EmbedBuilder()
                .setTitle('Contact the mods')
                .setDescription('If you have any feedback or concerns regarding the server, you can press the button below to create a private thread with server staff.')
                .setColor('Red');

            const randInt = getRandInt(0, 65535);
            const openBtn = new ButtonBuilder()
                .setCustomId(`ticket${randInt}`)
                .setLabel('Open a thread')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎟️');

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(openBtn);

            
            // make sure we can complete the task
            let canComplete = await checkChanPerms(interaction, threadChannel, ['ViewChannel', 'CreatePrivateThreads', 'SendMessagesInThreads']);
            if (!canComplete) {
                return;
            }

            if (logchan) {
                if (logchan.type === ChannelType.PublicThread || logchan.type === ChannelType.PrivateThread) {
                    canComplete = await checkChanPerms(interaction, logchan, ['ViewChannel', 'SendMessagesInThreads']);
                }
                else if (logchan.type === ChannelType.GuildText) {
                    canComplete = await checkChanPerms(interaction, logchan, ['ViewChannel', 'SendMessages']);
                }

                if (!canComplete) {
                    return;
                }
            }

            // we have the perms, so send the message
            const msg = await threadChannel.send({
                embeds: [embed],
                components: [row],
            });

            
            // upsert into the table
            // query the pool with a transaction
            const pgClient = await pool.connect();
            try {
                // start
                await pgClient.query('BEGIN');
                // delete -- delete the rows for this server
                await pgClient.query('DELETE FROM chatot.tickets WHERE serverid=$1', [interaction.guildId]);
                // upsert
                await pgClient.query('INSERT INTO chatot.tickets (serverid, messageid, threadchanid, staffid, logchanid) VALUES ($1, $2, $3, UNNEST($4::text[]), $5)', [interaction.guildId, msg.id, threadChannel.id, staffRoles, logchan?.id]);
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
            
            // let them know we're done
            await interaction.followUp('Ticket system updated; a new button has been created. Please delete any old posts containing the original submission button.');
        }

    },
};