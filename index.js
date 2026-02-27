const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const cleanupDirectories = () => {
    const directoriesToDelete = ['tmp', 'temp'];
    const projectPath = __dirname;  // assuming the index.js is in the project root

    directoriesToDelete.forEach(dir => {
        const dirPath = path.join(projectPath, dir);
        if (fs.existsSync(dirPath)) {
            fs.rmdirSync(dirPath, { recursive: true });
            console.log(`Deleted directory: ${dirPath}`);
            // Send bot notification here
            // For example, you could use nodemailer or any other notification service
        } else {
            console.log(`Directory not found: ${dirPath}`);
        }
    });
};

setInterval(cleanupDirectories, 120000);  // 120000 milliseconds = 2 minutes

console.log('Cleanup function initiated.');