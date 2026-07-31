const axios = require('axios');
const { createCtx, Carousel, AIRich, Toolkit } = require('../lib/messageBuilder');

module.exports = async function (sock, chatId, message, city) {
    try {
        // ─── FIX: Handle both string and array ──────────────────────────
        let cityName;
        if (Array.isArray(city)) {
            cityName = city.join(' ');
        } else if (typeof city === 'string') {
            cityName = city;
        } else if (city && typeof city === 'object') {
            // Kama ni object, jaribu kupata name
            cityName = city.name || city.city || city.location || String(city);
        } else {
            cityName = String(city || '');
        }
        
        // ─── CHECK IF CITY PROVIDED ──────────────────────────────────────
        if (!cityName || cityName.trim().length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '🌤️ *Usage:* .weather <city>\n\nExample: `.weather Dar es Salaam`\nExample: `.weather London`' 
            }, { quoted: message });
        }

        console.log('[WEATHER] Searching for:', cityName);

        const apiKey = '4902c0f2550f58298ad4146a92b65e10';
        
        // ─── FETCH WEATHER DATA ──────────────────────────────────────────
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`
        );
        const weather = response.data;
        
        // ─── CREATE CAROUSEL ──────────────────────────────────────────────
        const carousel = new Carousel(sock);
        const cards = [];
        
        // ─── CARD 1: CURRENT WEATHER ─────────────────────────────────────
        const temp = Math.round(weather.main.temp);
        const feelsLike = Math.round(weather.main.feels_like);
        const emoji = getWeatherEmoji(weather.weather[0].description);
        
        const currentCard = {
            header: {
                title: `${emoji} ${weather.name}`,
                hasMediaAttachment: false
            },
            body: {
                text: `*📍 Current Weather*\n\n` +
                      `🌡️ *Temperature:* ${temp}°C (feels like ${feelsLike}°C)\n` +
                      `☁️ *Condition:* ${weather.weather[0].description}\n` +
                      `💧 *Humidity:* ${weather.main.humidity}%\n` +
                      `💨 *Wind:* ${weather.wind.speed} m/s\n` +
                      `🌅 *Sunrise:* ${new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}\n` +
                      `🌇 *Sunset:* ${new Date(weather.sys.sunset * 1000).toLocaleTimeString()}\n\n` +
                      `💡 ${getWeatherAdvice(weather.weather[0].description)}`
            },
            footer: {
                text: `📍 ${weather.sys.country} | 🕐 ${new Date().toLocaleTimeString()}`
            }
        };
        cards.push(currentCard);
        
        // ─── CARDS 2-5: FORECAST ──────────────────────────────────────────
        const forecast = await getForecast(apiKey, weather.coord.lat, weather.coord.lon);
        
        if (forecast && forecast.length > 0) {
            forecast.slice(0, 4).forEach((day, index) => {
                const dayEmoji = getWeatherEmoji(day.weather);
                const card = {
                    header: {
                        title: `${dayEmoji} ${getDayName(index + 1)}`,
                        hasMediaAttachment: false
                    },
                    body: {
                        text: `*📅 ${getDate(index + 1)}*\n\n` +
                              `🌡️ *High:* ${Math.round(day.temp_max)}°C\n` +
                              `🌡️ *Low:* ${Math.round(day.temp_min)}°C\n` +
                              `☁️ *Condition:* ${day.weather}\n` +
                              `💧 *Humidity:* ${Math.round(day.humidity)}%\n` +
                              `💨 *Wind:* ${day.wind_speed} m/s`
                    },
                    footer: {
                        text: `📊 ${getWeatherAdvice(day.weather)}`
                    }
                };
                cards.push(card);
            });
        }
        
        // ─── BUILD AND SEND CAROUSEL ────────────────────────────────────
        carousel
            .setTitle(`🌤️ Weather Forecast: ${weather.name}`)
            .setBody(`📍 *${weather.sys.country}*\n\n👆 Swipe ➡️ for 5-day forecast`)
            .setFooter(`⚡ Mickey Glitch Sub`)
            .addCard(cards);
        
        await carousel.send(chatId, {
            quoted: message,
            fallbackText: `🌤️ *Weather: ${weather.name}*\n🌡️ ${temp}°C\n☁️ ${weather.weather[0].description}\n📍 ${weather.sys.country}`
        });
        
    } catch (error) {
        console.error('[WEATHER ERROR]', error.message);
        console.error('[WEATHER ERROR]', error.response?.data || '');
        
        // ─── FALLBACK: Send plain text ──────────────────────────────────
        let errorMsg = '❌ *Weather Error*\n\n';
        
        if (error.response?.status === 404) {
            errorMsg += `🌍 City "${cityName || city}" not found.\n\n`;
            errorMsg += `📌 Try these examples:\n`;
            errorMsg += `• \`.weather Dar es Salaam\`\n`;
            errorMsg += `• \`.weather London\`\n`;
            errorMsg += `• \`.weather New York\``;
        } else if (error.response?.status === 401) {
            errorMsg += `⚠️ API Key invalid.\n\nPlease contact the bot admin.`;
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            errorMsg += `⏰ Request timed out.\n\nPlease try again later.`;
        } else {
            errorMsg += `❌ ${error.message || 'Unknown error'}\n\n`;
            errorMsg += `🔄 Please try again later.`;
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

// ─── GET FORECAST ──────────────────────────────────────────────────────────
async function getForecast(apiKey, lat, lon) {
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=5`,
            { timeout: 10000 }
        );
        
        const forecast = [];
        const dailyData = {};
        
        response.data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!dailyData[date]) {
                dailyData[date] = {
                    temp_max: item.main.temp_max,
                    temp_min: item.main.temp_min,
                    weather: item.weather[0].description,
                    humidity: item.main.humidity,
                    wind_speed: item.wind.speed,
                    count: 1
                };
            } else {
                dailyData[date].temp_max = Math.max(dailyData[date].temp_max, item.main.temp_max);
                dailyData[date].temp_min = Math.min(dailyData[date].temp_min, item.main.temp_min);
                dailyData[date].humidity = (dailyData[date].humidity + item.main.humidity) / 2;
                dailyData[date].wind_speed = (dailyData[date].wind_speed + item.main.wind_speed) / 2;
                dailyData[date].count++;
            }
        });
        
        Object.values(dailyData).forEach(day => {
            forecast.push(day);
        });
        
        return forecast.slice(0, 5);
    } catch (error) {
        console.error('[FORECAST ERROR]', error.message);
        return [];
    }
}

// ─── GET DAY NAME ──────────────────────────────────────────────────────────
function getDayName(index) {
    const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'];
    return days[index] || `Day ${index + 1}`;
}

// ─── GET DATE ──────────────────────────────────────────────────────────────
function getDate(index) {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

// ─── GET WEATHER EMOJI ────────────────────────────────────────────────────
function getWeatherEmoji(condition) {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return '☀️';
    if (lower.includes('cloud')) return '⛅';
    if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('thunder') || lower.includes('storm')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
    if (lower.includes('wind')) return '💨';
    return '🌤️';
}

// ─── GET WEATHER ADVICE ────────────────────────────────────────────────────
function getWeatherAdvice(condition) {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) {
        return '☀️ Don\'t forget sunscreen and stay hydrated!';
    }
    if (lower.includes('rain') || lower.includes('drizzle')) {
        return '☂️ Carry an umbrella and drive carefully!';
    }
    if (lower.includes('snow')) {
        return '❄️ Dress warmly and drive with caution!';
    }
    if (lower.includes('cloud')) {
        return '⛅ Perfect day for outdoor activities!';
    }
    if (lower.includes('wind')) {
        return '💨 Wear a jacket and secure loose items!';
    }
    if (lower.includes('thunder') || lower.includes('storm')) {
        return '⚡ Stay indoors and avoid open areas!';
    }
    return '🌈 Enjoy your day!';
}