const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const channel = interaction.member.voice.channel;
        
        if (!channel) {
            return interaction.editReply('❌ You need to be in a voice channel!');
        }
        
        try {
            // Use discord-player's play method
            const result = await client.player.play(channel, query, {
                nodeOptions: {
                    metadata: interaction,
                    leaveOnEmpty: false,
                    leaveOnEmptyCooldown: 0,
                    leaveOnEnd: false,
                    leaveOnEndCooldown: 0,
                    volume: 50,
                }
            });
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🎵 Track Added')
                .setDescription(`**${result.track.title}**\n${result.track.author}`)
                .setThumbnail(result.track.thumbnail)
                .addFields(
                    { name: 'Duration', value: result.track.duration, inline: true },
                    { name: 'Requested by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('[PLAY ERROR]', error);
            return interaction.editReply('❌ Failed to play the track!');
        }
    }
};