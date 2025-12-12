require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command data
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`[INFO] Loaded command data: ${command.data.name}`);
    } else {
        console.log(`[WARNING] Command at ${filePath} is missing "data" property.`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.BOT_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`[DEPLOY] Started refreshing ${commands.length} application (/) commands.`);

        // Register commands to a specific guild (faster for testing)
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`[DEPLOY] Successfully reloaded ${data.length} application (/) commands.`);
        console.log('[SUCCESS] Slash commands deployed!');
    } catch (error) {
        console.error('[ERROR] Failed to deploy commands:', error);
    }
})();
