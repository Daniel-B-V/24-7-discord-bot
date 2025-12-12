const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the current music queue'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.editReply('❌ There is no music playing right now!');
        }

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray();

        let queueString = `**Now Playing:**\n🎵 ${currentTrack.title} - ${currentTrack.author} | \`${currentTrack.duration}\`\n\n`;

        if (tracks.length > 0) {
            queueString += `**Up Next:**\n`;

            tracks.slice(0, 10).forEach((track, index) => {
                queueString += `${index + 1}. ${track.title} - ${track.author} | \`${track.duration}\`\n`;
            });

            if (tracks.length > 10) {
                queueString += `\n*...and ${tracks.length - 10} more track(s)*`;
            }
        } else {
            queueString += `**Up Next:**\nNo tracks in queue`;
        }

        const embed = {
            color: 0x0099ff,
            title: '📃 Music Queue',
            description: queueString,
            fields: [
                {
                    name: 'Total Tracks',
                    value: `${tracks.length + 1}`,
                    inline: true
                },
                {
                    name: 'Duration',
                    value: queue.estimatedDuration ? `${Math.floor(queue.estimatedDuration / 60000)}:${Math.floor((queue.estimatedDuration % 60000) / 1000).toString().padStart(2, '0')}` : 'N/A',
                    inline: true
                }
            ],
            timestamp: new Date()
        };

        return interaction.editReply({ embeds: [embed] });
    }
};
