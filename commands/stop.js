const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.editReply('❌ There is no music playing right now!');
        }

        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel!');
        }

        try {
            queue.delete();

            const embed = {
                color: 0xff0000,
                title: '⏹️ Stopped',
                description: 'Music stopped and queue cleared!',
                timestamp: new Date()
            };

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[STOP ERROR]', error);
            return interaction.editReply('❌ An error occurred while stopping the music!');
        }
    }
};
