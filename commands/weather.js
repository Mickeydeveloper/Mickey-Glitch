const axios = require('axios');
const { createCtx, AIRich, Toolkit } = require('../lib/messageBuilder');

module.exports = async function (sock, chatId, message, city) {
    try {
        // ─── CHECK CITY ──────────────────────────────────────────────────
        if (!city || city.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '🌤️ *Usage:* .weather <city>\n\nExample: `.weather Dar es Salaam`' 
            }, { quoted: message });
        }

        const apiKey = '4902c0f2550f58298ad4146a92b65e10';
        const cityName = city.join(' ');
        
        // ─── FETCH WEATHER ──────────────────────────────────────────────
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`
        );
        const w = response.data;
        
        // ─── CREATE AI RICH MESSAGE ──────────────────────────────────────
        const ai = new AIRich(sock);
        
        const emoji = getWeatherEmoji(w.weather[0].description);
        const temp = Math.round(w.main.temp);
        const feelsLike = Math.round(w.main.feels_like);
        
        ai
            .setTitle(`🌤️ Weather Report: ${w.name}`)
            .setBody(`📍 *${w.sys.country}* | 🕐 ${new Date().toLocaleTimeString()}`)
            
            // ─── MAIN TEXT ──────────────────────────────────────────────
            .addText(`*${emoji} Current Weather in ${w.name}*\n\n` +
                    `🌡️ **Temperature:** ${temp}°C (feels like ${feelsLike}°C)\n` +
                    `☁️ **Condition:** ${w.weather[0].description}\n` +
                    `💧 **Humidity:** ${w.main.humidity}%\n` +
                    `💨 **Wind Speed:** ${w.wind.speed} m/s\n` +
                    `🌅 **Sunrise:** ${new Date(w.sys.sunrise * 1000).toLocaleTimeString()}\n` +
                    `🌇 **Sunset:** ${new Date(w.sys.sunset * 1000).toLocaleTimeString()}`)
            
            // ─── TABLE: Weather Details ──────────────────────────────────
            .addTable([
                ["📊 Metric", "Value", "Status"],
                ["🌡️ Temperature", `${temp}°C`, getTempStatus(temp)],
                ["💧 Humidity", `${w.main.humidity}%`, w.main.humidity > 70 ? "High" : "Normal"],
                ["💨 Wind", `${w.wind.speed} m/s`, w.wind.speed > 10 ? "Windy" : "Calm"],
                ["☁️ Clouds", `${w.clouds.all}%`, w.clouds.all > 50 ? "Cloudy" : "Clear"],
                ["👁️ Visibility", `${(w.visibility / 1000).toFixed(1)} km`, "Normal"]
            ])
            
            // ─── ADVICE ──────────────────────────────────────────────────
            .addText(`💡 *Weather Advice*\n\n${getWeatherAdvice(w.weather[0].description)}`)
            
            // ─── SUGGESTIONS ─────────────────────────────────────────────
            .addSuggest([
                `Weather in ${w.name} tomorrow`,
                `Weather in ${w.name} this week`,
                "Show me other cities"
            ])
            
            // ─── TIP ──────────────────────────────────────────────────────
            .addTip(`🔄 Updated: ${new Date().toLocaleString()}`);
        
        // ─── SEND ────────────────────────────────────────────────────────
        await ai.send(chatId, {
            quoted: message,
            fallbackText: `🌤️ Weather: ${w.name}\n🌡️ ${temp}°C\n☁️ ${w.weather[0].description}`
        });
        
    } catch (error) {
        console.error('[WEATHER ERROR]', error.message);
        
        let errorMsg = '❌ *Weather Error*\n\n';
        if (error.response?.status === 404) {
            errorMsg += `City "${city}" not found.\n\n`;
            errorMsg += `📌 Try: .weather Dar es Salaam\n`;
            errorMsg += `📌 Or: .weather London`;
        } else {
            errorMsg += `❌ ${error.message || 'Unknown error'}`;
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

function getWeatherEmoji(condition) {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return '☀️';
    if (lower.includes('cloud')) return '⛅';
    if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('thunder') || lower.includes('storm')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
    return '🌤️';
}

function getTempStatus(temp) {
    if (temp > 35) return '🔥 Very Hot';
    if (temp > 30) return '☀️ Hot';
    if (temp > 25) return '🌤️ Warm';
    if (temp > 20) return '🌥️ Pleasant';
    if (temp > 15) return '🌦️ Cool';
    if (temp > 10) return '🥶 Cold';
    return '❄️ Freezing';
}

function getWeatherAdvice(condition) {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) {
        return '☀️ *Sunny Day!*\nApply sunscreen and stay hydrated.';
    }
    if (lower.includes('rain') || lower.includes('drizzle')) {
        return '☂️ *Rain Alert!*\nCarry an umbrella and drive carefully.';
    }
    if (lower.includes('snow')) {
        return '❄️ *Snow Day!*\nDress warmly and drive with caution.';
    }
    if (lower.includes('cloud')) {
        return '⛅ *Cloudy Weather*\nPerfect day for outdoor activities!';
    }
    if (lower.includes('wind')) {
        return '💨 *Windy Conditions*\nSecure loose items and wear a jacket.';
    }
    if (lower.includes('thunder') || lower.includes('storm')) {
        return '⚡ *Storm Warning!*\nStay indoors and avoid open areas.';
    }
    return '🌈 Enjoy the weather!';
}