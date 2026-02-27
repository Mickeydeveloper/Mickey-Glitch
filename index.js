const fs = require('fs');
const path = require('path');

const cleanupFolders = () => {
    const folders = ['tmp', 'temp', 'baileys'];

    folders.forEach(folder => {
        const folderPath = path.join(__dirname, folder);
        fs.rmdir(folderPath, { recursive: true }, (err) => {
            if (err) {
                console.error(`Error cleaning up folder ${folder}:`, err);
            } else {
                console.log(`Cleaned up folder: ${folder}`);
            }
        });
    });
};

setInterval(() => {
    console.log('Cleaning up temporary folders...');
    cleanupFolders();
}, 120000);

console.log('Bot number notification: Your bot is running and will clean up every 2 minutes.');