const fs = require('fs');
const path = require('path');

function loadCommands(client) {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) {
            client.commands.set(command.data.name, command);
        }
    }
}

function loadButtonHandlers(client) {
    const buttonsPath = path.join(__dirname, 'buttons');
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

    for (const file of buttonFiles) {
        const buttonHandler = require(path.join(buttonsPath, file));
        client.buttonHandlers.set(buttonHandler.data.customId, buttonHandler);
    }
}

module.exports = { loadCommands, loadButtonHandlers };