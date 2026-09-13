const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const WIDTH = 641;
const HEIGHT = 1280;

async function createFakeNote({ text, photo_url, username }) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, canvas);
    await drawProfilePhoto(ctx, photo_url || 'https://i.pravatar.cc/200?img=12');
    drawUsername(ctx, username || 'instagram');
    drawMessageBubble(ctx, text || 'Hello world');
    blurArea(ctx, canvas, 0, 0, WIDTH, HEIGHT - 325, 10);

    return canvas.encode('png');
}

async function drawBackground(ctx, canvas) {
    const image = await loadImage('https://i.ibb.co.com/VY1bmDMm/bg.jpg');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

async function drawProfilePhoto(ctx, photoUrl) {
    try {
        const response = await fetch(photoUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch photo: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const image = await loadImage(Buffer.from(arrayBuffer));

        const avatarX = 22;
        const avatarY = 1049;
        const avatarSize = 100;
        const avatarCenterX = avatarX + avatarSize / 2;
        const avatarCenterY = avatarY + avatarSize / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        ctx.fillStyle = '#2B3036';
        ctx.beginPath();
        ctx.arc(103, 1087, 5.5, 0, Math.PI * 2);
        ctx.arc(124, 1099, 10, 0, Math.PI * 2);
        ctx.fill();
    } catch (error) {
        console.error('[noteinsta] profile image failed:', error);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(22, 1049, 100, 100);
    }
}

function drawMessageBubble(ctx, text) {
    const x = 120;
    const centerY = 1099;
    const maxWidth = 498;
    const paddingX = 24;
    const paddingY = 16;
    const radius = 35;
    const font = '18px Arial';
    const lineHeight = 24;
    const maxCharacters = 80;

    ctx.font = font;
    text = String(text ?? '');
    if (text.length > maxCharacters) {
        text = text.slice(0, maxCharacters - 3).trimEnd() + '...';
    }

    const words = text.split(/\s+/);
    const maxTextWidth = maxWidth - paddingX * 2;
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxTextWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) lines.push(currentLine);

    const textWidths = lines.map((line) => ctx.measureText(line).width);
    const textWidth = Math.max(...textWidths, 0);
    const bubbleWidth = Math.min(maxWidth, textWidth + paddingX * 2);
    const bubbleHeight = lines.length * lineHeight + paddingY * 2;
    const bubbleY = centerY - bubbleHeight / 2;
    const actualRadius = Math.min(radius, bubbleHeight / 2);

    ctx.fillStyle = '#2B3036';
    ctx.beginPath();
    ctx.roundRect(x, bubbleY, bubbleWidth, bubbleHeight, actualRadius);
    ctx.fill();

    const bubbleCenterY = bubbleY + bubbleHeight / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    lines.forEach((line, index) => {
        const lineY = bubbleCenterY + (index - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line, x + paddingX, lineY);
    });
}

function drawUsername(ctx, username) {
    username = String(username ?? '');
    const panelColor = '#171C20';
    const placeholdBg = '#2B3036';

    ctx.fillStyle = panelColor;
    ctx.fillRect(190, 995, 265, 40);
    ctx.fillStyle = placeholdBg;
    ctx.fillRect(35, 1180, 315, 45);

    const headerFont = 'bold 18px Arial';
    const nowFont = '18px Arial';
    ctx.font = headerFont;
    const usernameWidth = ctx.measureText(username).width;
    ctx.font = nowFont;
    const nowWidth = ctx.measureText(' · Now').width;
    const totalWidth = usernameWidth + nowWidth;
    const headerCenterX = 320;
    const startX = headerCenterX - totalWidth / 2;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = headerFont;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(username, startX, 1017);

    ctx.font = nowFont;
    ctx.fillStyle = '#8C9299';
    ctx.fillText(' · Now', startX + usernameWidth, 1017);

    ctx.font = '18px Arial';
    ctx.fillStyle = '#A2A8B0';
    ctx.fillText(`Message ${username}`, 39, 1202);
}

function blurArea(ctx, canvas, x, y, width, height, blur = 10) {
    const tempCanvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(tempCanvas, x, y, width, height);
    ctx.restore();
    ctx.filter = 'none';
}

async function resolvePhotoBuffer(message) {
    try {
        if (message?.message?.imageMessage) {
            const media = await downloadMediaMessage(
                { message: { imageMessage: message.message.imageMessage } },
                'buffer',
                {},
                {}
            );
            return media;
        }

        if (message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            const quoted = { message: { imageMessage: message.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage } };
            const media = await downloadMediaMessage(quoted, 'buffer', {}, {});
            return media;
        }
    } catch (error) {
        console.error('[noteinsta] image download failed:', error);
    }

    return null;
}

async function noteInstaCommand(sock, chatId, message, rawText = '') {
    try {
        const input = String(rawText || message?.message?.conversation || message?.message?.extendedTextMessage?.text || '').trim();
        const args = input.split(/\s+/).filter(Boolean);

        let username = 'instagram';
        let text = input;

        if (args.length >= 2 && !args[0].startsWith('http')) {
            username = args[0];
            text = args.slice(1).join(' ');
        }

        if (!text) {
            await sock.sendMessage(chatId, {
                text: 'Usage: .noteinsta [username] text\nExample: .noteinsta yellowhosino22 Hello world'
            }, { quoted: message });
            return;
        }

        let photoUrl = null;
        const mediaBuffer = await resolvePhotoBuffer(message);
        if (mediaBuffer) {
            photoUrl = `data:image/png;base64,${mediaBuffer.toString('base64')}`;
        }

        const buffer = await createFakeNote({
            text,
            photo_url: photoUrl || 'https://i.pravatar.cc/200?img=12',
            username
        });

        await sock.sendMessage(chatId, {
            image: buffer,
            caption: '📸 Fake Instagram Note'
        }, { quoted: message });
    } catch (error) {
        console.error('[noteinsta] error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to generate note. Try: .noteinsta username text'
        }, { quoted: message });
    }
}

noteInstaCommand.commandName = '.noteinsta';
noteInstaCommand.aliases = ['.instanote', '.notecanvas'];
noteInstaCommand.category = 'MEDIA';
noteInstaCommand.description = 'Generate a fake Instagram note image';

module.exports = noteInstaCommand;
