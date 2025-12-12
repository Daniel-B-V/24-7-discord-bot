const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube, Spotify, SoundCloud, or search')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Song name, URL (YouTube/Spotify/SoundCloud), or search keywords')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        // Check if user is in a voice channel
        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to play music!');
        }

        try {
            const player = client.player;

            // Search for the track
            const searchResult = await player.search(query, {
                requestedBy: interaction.user
            });

            if (!searchResult || !searchResult.tracks.length) {
                return interaction.editReply('❌ No results found!');
            }

            // Get or create queue
            let queue = player.nodes.get(interaction.guildId);
            
            if (!queue) {
                // Create new queue
                queue = player.nodes.create(interaction.guild, {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user
                    },
                    selfDeaf: false,
                    volume: 80,
                    leaveOnEmpty: false,
                    leaveOnEmptyCooldown: 0,
                    leaveOnEnd: false,
                    leaveOnEndCooldown: 0,
                    // Use existing 24/7 connection
                    connection: client.player.voiceUtils.getConnection(interaction.guildId)
                });
                
                // Try to use existing connection first
                const existingConnection = client.player.voiceUtils.getConnection(interaction.guildId);
                if (existingConnection) {
                    queue.connection = existingConnection;
                } else {
                    // Otherwise connect normally
                    await queue.connect(voiceChannel);
                }
            } else {
                // If queue exists but no connection, connect to user's channel
                if (!queue.connection) {
                    await queue.connect(voiceChannel);
                }
            }

            // Add track(s) to queue
            if (searchResult.playlist) {
                queue.addTrack(searchResult.tracks);
            } else {
                queue.addTrack(searchResult.tracks[0]);
            }

            // Play if not already playing
            if (!queue.isPlaying()) {
                await queue.node.play();
            }

            // Send response
            const track = searchResult.tracks[0];
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(searchResult.playlist ? '📃 Playlist Added' : '🎵 Track Added')
                .setDescription(searchResult.playlist
                    ? `**${searchResult.playlist.title}**\n${searchResult.tracks.length} tracks added to queue`
                    : `**${track.title}**\n${track.author}`)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: 'Duration', value: track.duration, inline: true },
                    { name: 'Requested by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[PLAY ERROR]', error);
            
            // Specific error handling
            if (error.message.includes('No extractor found')) {
                return interaction.editReply('❌ Unable to play from that source. Try a YouTube, Spotify, or SoundCloud link.');
            }
            
            if (error.message.includes('connection')) {
                return interaction.editReply('❌ Could not connect to voice channel. Make sure I have permission to join and speak.');
            }
            
            return interaction.editReply('❌ An error occurred while trying to play the track!');
        }
    }
};