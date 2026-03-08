const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {

if (!sock || typeof sock.sendMessage !== 'function') return;

const textBody =
message.message?.conversation ||
message.message?.extendedTextMessage?.text ||
'';

const query = textBody.split(" ").slice(1).join(" ");

if (!query){
return sock.sendMessage(chatId,{
text:'🎵 *Andika jina la wimbo!*\n\nMfano: .play Adele Hello'
},{quoted:message});
}

try{

await sock.sendMessage(chatId,{ react:{ text:'⏳', key:message.key } });

const { videos } = await yts(query);

if (!videos || !videos.length){
return sock.sendMessage(chatId,{
text:'❌ *Wimbo haupatikani!*'
});
}

// chagua video
const vid = videos[0];

// API mpya
const api = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(vid.url)}`;

const res = await axios.get(api,{ timeout:30000 });


// pata audio url
const dlUrl =
res.data?.data?.download ||
res.data?.data?.url ||
res.data?.data?.audio ||
res.data?.url;


if (!dlUrl){
return sock.sendMessage(chatId,{
text:'❌ *Download imeshindikana!*'
});
}


// RECORDING STATUS
try{
await sock.sendPresenceUpdate('recording',chatId);
}catch{}


// SEND AUDIO WITH WHATSAPP AD PREVIEW
await sock.sendMessage(chatId,{

audio:{ url:dlUrl },

mimetype:'audio/mpeg',

fileName:`${vid.title}.mp3`,

ptt:false,

contextInfo:{
externalAdReply:{

title:vid.title,

body:`⏱️ ${vid.timestamp} • 👁️ ${vid.views?.toLocaleString() || 0} views`,

thumbnailUrl:vid.thumbnail,

sourceUrl:vid.url,

mediaType:1,

renderLargerThumbnail:true

}

}

},{quoted:message});


await sock.sendMessage(chatId,{
react:{ text:'✅', key:message.key }
});

}catch(err){

console.log("PLAY ERROR:",err);

await sock.sendMessage(chatId,{
text:'🚨 *Hitilafu imetokea!*'
});

}

finally{

try{
await sock.sendPresenceUpdate('paused',chatId);
}catch{}

}

}

module.exports = songCommand;