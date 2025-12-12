process.env.FFMPEG_PATH = 'C:\\ffmpeg\\bin\\ffmpeg.exe';
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const fs = require('fs');
const path = require('path');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize discord-player
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    },
    connectionTimeout: 30000
});

// Store player instance globally
client.player = player;

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[INFO] Loaded command: ${command.data.name}`);
    } else {
        console.log(`[WARNING] Command at ${filePath} is missing "data" or "execute" property.`);
    }
}

// Auto-join voice channel on ready - USING DISCORD-PLAYER'S SYSTEM
client.once('ready', async () => {
    console.log(`[READY] Logged in as ${client.user.tag}`);

    // Load extractors
    try {
        console.log('[PLAYER] Loading extractors...');
        await player.extractors.loadMulti(DefaultExtractors);
        console.log('[PLAYER] Extractors loaded successfully');
    } catch (error) {
        console.error('[ERROR] Failed to load extractors:', error);
    }

    const vcId = process.env.VC_ID;
    const guildId = process.env.GUILD_ID;

    if (!vcId || !guildId) {
        console.log('[ERROR] VC_ID or GUILD_ID not set in .env file');
        return;
    }

    try {
        const guild = await client.guilds.fetch(guildId);
        const voiceChannel = await guild.channels.fetch(vcId);

        if (!voiceChannel || voiceChannel.type !== 2) {
            console.log('[ERROR] Voice channel not found or invalid');
            return;
        }

        console.log(`[24/7] Ready to join: ${voiceChannel.name}`);

        // Create a persistent queue for 24/7
        const queue = player.nodes.create(guild, {
            metadata: {
                channel: null,
                client: guild.members.me,
                requestedBy: client.user
            },
            selfDeaf: false,
            selfMute: true, // Muted by default
            volume: 50,
            leaveOnEmpty: false,
            leaveOnEmptyCooldown: 0,
            leaveOnEnd: false,
            leaveOnEndCooldown: 0,
            bufferingTimeout: 3000,
            connectionTimeout: 30000
        });

        // Connect to voice channel
        try {
            await queue.connect(voiceChannel);
            console.log(`[24/7] Successfully joined: ${voiceChannel.name}`);
        } catch (error) {
            console.error('[24/7 ERROR] Failed to join:', error);
        }

    } catch (error) {
        console.error('[ERROR] Failed to setup 24/7:', error);
    }
});

// Keep bot in VC 24/7 - rejoin if disconnected
client.on('voiceStateUpdate', async (oldState, newState) => {
    // Check if bot was disconnected
    if (oldState.member.id === client.user.id && !newState.channelId) {
        console.log('[24/7] Bot was disconnected, rejoining...');

        setTimeout(async () => {
            try {
                const vcId = process.env.VC_ID;
                const guildId = process.env.GUILD_ID;
                
                if (!vcId || !guildId) return;
                
                const guild = await client.guilds.fetch(guildId);
                const voiceChannel = await guild.channels.fetch(vcId);

                // Get or create queue
                let queue = player.nodes.get(guildId);
                if (!queue) {
                    queue = player.nodes.create(guild, {
                        metadata: {
                            channel: null,
                            client: guild.members.me,
                            requestedBy: client.user
                        },
                        selfDeaf: false,
                        selfMute: true,
                        volume: 50,
                        leaveOnEmpty: false,
                        leaveOnEmptyCooldown: 0,
                        leaveOnEnd: false,
                        leaveOnEndCooldown: 0
                    });
                }

                // Reconnect
                await queue.connect(voiceChannel);
                console.log('[24/7] Rejoined voice channel');
                
            } catch (error) {
                console.error('[ERROR] Failed to rejoin:', error);
            }
        }, 2000);
    }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error('[COMMAND ERROR]', error);
        const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Player events - ADD THESE FOR BETTER DEBUGGING
player.events.on('debug', async (queue, message) => {
    console.log(`[PLAYER DEBUG] ${message}`);
});

player.events.on('playerStart', (queue, track) => {
    console.log(`[PLAYER] Now playing: ${track.title} in ${queue.channel.name}`);
});

player.events.on('playerFinish', (queue, track) => {
    console.log(`[PLAYER] Finished: ${track.title}`);
});

player.events.on('audioTrackAdd', (queue, track) => {
    console.log(`[QUEUE] Added: ${track.title}`);
});

player.events.on('error', (queue, error) => {
    console.error(`[PLAYER ERROR] ${error.message}`);
    console.error(error);
});

player.events.on('connection', (queue) => {
    console.log(`[PLAYER] Connected to: ${queue.channel.name}`);
});

player.events.on('connectionError', (queue, error) => {
    console.error(`[PLAYER CONNECTION ERROR] ${error.message}`);
});

player.events.on('emptyQueue', (queue) => {
    console.log('[PLAYER] Queue is empty');
});

// Login
client.login(process.env.BOT_TOKEN);