const axios = require('axios');
const { createCtx, Carousel, Toolkit } = require('../lib/messageBuilder');

module.exports = async function (sock, chatId, message, city) {
    try {
        // ─── FIX: Handle city input ──────────────────────────────────────
        let cityName;
        if (Array.isArray(city)) {
            cityName = city.join(' ');
        } else if (typeof city === 'string') {
            cityName = city;
        } else {
            cityName = String(city || '');
        }
        
        if (!cityName || cityName.trim().length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '🌤️ *Usage:* .weather <city>\n\nExample: `.weather Dar es Salaam`' 
            }, { quoted: message });
        }

        console.log('[WEATHER] Searching for:', cityName);

        const apiKey = '4902c0f2550f58298ad4146a92b65e10';
        
        // ─── FETCH WEATHER ──────────────────────────────────────────────
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`
        );
        const weather = response.data;
        
        const temp = Math.round(weather.main.temp);
        const feelsLike = Math.round(weather.main.feels_like);
        const emoji = getWeatherEmoji(weather.weather[0].description);
        const condition = weather.weather[0].description;
        const iconCode = weather.weather[0].icon;
        
        // ─── WEATHER ICON URL ────────────────────────────────────────────
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        
        // ─── CREATE CAROUSEL WITH IMAGE ──────────────────────────────────
        const carousel = new Carousel(sock);
        const cards = [];
        
        // ─── CARD 1: CURRENT WEATHER (With Image) ──────────────────────
        const currentCard = {
            header: {
                title: `${emoji} ${weather.name}`,
                hasMediaAttachment: true,
                imageMessage: {
                    url: iconUrl,
                    mimetype: 'image/png'
                }
            },
            body: {
                text: `*📍 ${weather.sys.country}*\n\n` +
                      `🌡️ **Temperature:** ${temp}°C\n` +
                      `🌡️ **Feels Like:** ${feelsLike}°C\n` +
                      `☁️ **Condition:** ${condition}\n` +
                      `💧 **Humidity:** ${weather.main.humidity}%\n` +
                      `💨 **Wind:** ${weather.wind.speed} m/s\n` +
                      `🌅 **Sunrise:** ${new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}\n` +
                      `🌇 **Sunset:** ${new Date(weather.sys.sunset * 1000).toLocaleTimeString()}`
            },
            footer: {
                text: `🕐 ${new Date().toLocaleTimeString()} | ⚡ Mickey Glitch Sub`
            }
        };
        cards.push(currentCard);
        
        // ─── CARDS 2-5: FORECAST ──────────────────────────────────────────
        const forecast = await getForecast(apiKey, weather.coord.lat, weather.coord.lon);
        
        if (forecast && forecast.length > 0) {
            forecast.slice(0, 4).forEach((day, index) => {
                const dayEmoji = getWeatherEmoji(day.weather);
                const dayIcon = getWeatherIcon(day.weather);
                const card = {
                    header: {
                        title: `${dayEmoji} ${getDayName(index + 1)}`,
                        hasMediaAttachment: true,
                        imageMessage: {
                            url: `https://openweathermap.org/img/wn/${dayIcon}@4x.png`,
                            mimetype: 'image/png'
                        }
                    },
                    body: {
                        text: `*📅 ${getDate(index + 1)}*\n\n` +
                              `🌡️ **High:** ${Math.round(day.temp_max)}°C\n` +
                              `🌡️ **Low:** ${Math.round(day.temp_min)}°C\n` +
                              `☁️ **Condition:** ${day.weather}\n` +
                              `💧 **Humidity:** ${Math.round(day.humidity)}%\n` +
                              `💨 **Wind:** ${day.wind_speed} m/s`
                    },
                    footer: {
                        text: `💡 ${getWeatherAdvice(day.weather)}`
                    }
                };
                cards.push(card);
            });
        }
        
        // ─── BUILD AND SEND ─────────────────────────────────────────────
        carousel
            .setTitle(`🌤️ Weather Forecast: ${weather.name}`)
            .setBody(`📍 *${weather.sys.country}*\n\n👆 Swipe ➡️ for 5-day forecast`)
            .setFooter(`⚡ Mickey Glitch Sub`)
            .addCard(cards);
        
        await carousel.send(chatId, {
            quoted: message,
            fallbackText: `🌤️ *Weather: ${weather.name}*\n🌡️ ${temp}°C\n☁️ ${condition}`
        });
        
    } catch (error) {
        console.error('[WEATHER ERROR]', error.message);
        
        let errorMsg = '❌ *Weather Error*\n\n';
        if (error.response?.status === 404) {
            errorMsg += `🌍 City "${cityName}" not found.\n\n📌 Try: .weather Dar es Salaam`;
        } else {
            errorMsg += `❌ ${error.message || 'Unknown error'}`;
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

async function getForecast(apiKey, lat, lon) {
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=5`,
            { timeout: 10000 }
        );
        
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
                    icon: item.weather[0].icon,
                    count: 1
                };
            } else {
                dailyData[date].temp_max = Math.max(dailyData[date].temp_max, item.main.temp_max);
                dailyData[date].temp_min = Math.min(dailyData[date].temp_min, item.main.temp_min);
                dailyData[date].humidity = (dailyData[date].humidity + item.main.humidity) / 2;
                dailyData[date].wind_speed = (dailyData[date].wind_speed + item.wind.speed) / 2;
                dailyData[date].count++;
            }
        });
        
        return Object.values(dailyData).slice(0, 5);
    } catch (error) {
        console.error('[FORECAST ERROR]', error.message);
        return [];
    }
}

function getDayName(index) {
    const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'];
    return days[index] || `Day ${index + 1}`;
}

function getDate(index) {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

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

function getWeatherIcon(condition) {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return '01d';
    if (lower.includes('cloud')) return '04d';
    if (lower.includes('rain') || lower.includes('drizzle')) return '10d';
    if (lower.includes('thunder') || lower.includes('storm')) return '11d';
    if (lower.includes('snow')) return '13d';
    if (lower.includes('fog') || lower.includes('mist')) return '50d';
    return '01d';
}

function getWeatherAdvice(condition) {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) {
        return '☀️ Don\'t forget sunscreen!';
    }
    if (lower.includes('rain') || lower.includes('drizzle')) {
        return '☂️ Carry an umbrella!';
    }
    if (lower.includes('snow')) {
        return '❄️ Stay warm!';
    }
    if (lower.includes('cloud')) {
        return '⛅ Perfect for outdoor activities';
    }
    if (lower.includes('wind')) {
        return '💨 Wear a jacket';
    }
    if (lower.includes('thunder') || lower.includes('storm')) {
        return '⚡ Stay indoors!';
    }
    return '🌈 Enjoy your day!';
}