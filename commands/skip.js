const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

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

        const currentTrack = queue.currentTrack;

        try {
            queue.node.skip();

            const embed = {
                color: 0xff9900,
                title: '⏭️ Skipped',
                description: `Skipped: **${currentTrack.title}**`,
                timestamp: new Date()
            };

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[SKIP ERROR]', error);
            return interaction.editReply('❌ An error occurred while skipping the track!');
        }
    }
};
