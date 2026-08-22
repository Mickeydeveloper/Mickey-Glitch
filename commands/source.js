// ✨ AI TANNING IMAGE FEATURE - ADVANCED & OPTIMIZED
const axios = require('axios')
const FormData = require('form-data')
const fileType = require('file-type')
const crypto = require('crypto')
const baileys = require('@whiskeysockets/baileys')
const { createCtx, Button, ButtonV2, Carousel, AIRich } = require('../lib/messageBuilder')

const userMessages = Object.create(null)

const fileTypeFromBuffer =
  typeof fileType?.fileTypeFromBuffer === 'function'
    ? fileType.fileTypeFromBuffer
    : typeof fileType?.default?.fileTypeFromBuffer === 'function'
      ? fileType.default.fileTypeFromBuffer
      : null

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ═══════════════════════════════════════════════════════════════
// 🎭 IDENTITY GENERATOR - ANTI-DETECTION SYSTEM
// ═══════════════════════════════════════════════════════════════

class IdentityGenerator {
    static userAgents = {
        chrome_windows: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.{b}.{p} Safari/537.36'
        ],
        chrome_mac: [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.{b}.{p} Safari/537.36'
        ],
        chrome_android: [
            'Mozilla/5.0 (Linux; Android 14; {device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.{b}.{p} Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; {device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.{b}.{p} Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 12; {device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.{b}.{p} Mobile Safari/537.36'
        ],
        chrome_ios: [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_{v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/{v}.0.{b}.{p} Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_{v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/{v}.0.{b}.{p} Mobile/15E148 Safari/604.1'
        ],
        firefox_windows: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:{v}.0) Gecko/20100101 Firefox/{v}.0'
        ],
        firefox_mac: [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:{v}.0) Gecko/20100101 Firefox/{v}.0'
        ],
        safari_mac: [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.{v} Safari/605.1.15'
        ],
        safari_ios: [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_{v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.{v} Mobile/15E148 Safari/604.1'
        ],
        edge_windows: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v}.0.0.0 Safari/537.36 Edg/{v}.0.0.0'
        ]
    }

    static androidDevices = [
        'SM-S918B', 'SM-S918U', 'SM-S911B', 'SM-S911U',
        'SM-S928B', 'SM-S928U', 'SM-S921B', 'SM-S921U',
        'Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a', 'Pixel 6 Pro', 'Pixel 6', 'Pixel 6a',
        '2210132G', '2210132C', '22081212C',
        'RMX3700', 'RMX3701', 'CPH2449',
        'IN2023', 'IN2025', 'LE2123',
        'V2254', 'V2250', 'V2241',
        '2201116TG', '2112123G', '2201117TG'
    ]

    static getRandomVersion() {
        const major = Math.floor(Math.random() * 30) + 100
        const minor = Math.floor(Math.random() * 10)
        const build = Math.floor(Math.random() * 9999)
        const patch = Math.floor(Math.random() * 200)
        return { major, minor, build, patch }
    }

    static generateUserAgent() {
        const platforms = Object.keys(this.userAgents)
        const platform = platforms[Math.floor(Math.random() * platforms.length)]
        const templates = this.userAgents[platform]
        const template = templates[Math.floor(Math.random() * templates.length)]

        const version = this.getRandomVersion()
        const device = this.androidDevices[Math.floor(Math.random() * this.androidDevices.length)]

        return template
            .replace(/{v}/g, version.major)
            .replace(/{b}/g, version.build)
            .replace(/{p}/g, version.patch)
            .replace(/{device}/g, device)
    }

    static generateResidentialIP() {
        const residentialRanges = [
            [73, 0, 0, 0, 73, 255, 255, 255],
            [76, 0, 0, 0, 76, 255, 255, 255],
            [98, 0, 0, 0, 98, 255, 255, 255],
            [174, 192, 0, 0, 174, 255, 255, 255],
            [85, 0, 0, 0, 85, 255, 255, 255],
            [88, 0, 0, 0, 88, 255, 255, 255],
            [92, 0, 0, 0, 92, 255, 255, 255],
            [119, 0, 0, 0, 119, 255, 255, 255],
            [122, 0, 0, 0, 122, 255, 255, 255],
            [41, 0, 0, 0, 41, 255, 255, 255],
            [197, 0, 0, 0, 197, 255, 255, 255]
        ]

        const range = residentialRanges[Math.floor(Math.random() * residentialRanges.length)]
        const ip = []

        for (let i = 0; i < 4; i++) {
            const min = range[i]
            const max = range[i + 4]
            ip.push(min + Math.floor(Math.random() * (max - min + 1)))
        }

        return ip.join('.')
    }

    static generateDeviceId() {
        const patterns = [
            () => crypto.randomUUID(),
            () => crypto.randomBytes(8).toString('hex'),
            () => `${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
            () => crypto.randomBytes(16).toString('hex'),
            () => `${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 10)}`
        ]

        const pattern = patterns[Math.floor(Math.random() * patterns.length)]
        return pattern()
    }

    static generateSessionId() {
        return crypto.randomBytes(32).toString('hex')
    }

    static generateFingerprint() {
        return {
            sessionId: this.generateSessionId(),
            deviceId: this.generateDeviceId(),
            clientId: crypto.randomBytes(16).toString('hex'),
            visitorId: crypto.randomBytes(8).toString('hex'),
            requestId: crypto.randomUUID()
        }
    }

    static generateFullIdentity() {
        return {
            userAgent: this.generateUserAgent(),
            ip: this.generateResidentialIP(),
            fingerprint: this.generateFingerprint(),
            timestamp: Date.now()
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 RETRY MANAGER - SMART RETRY LOGIC
// ═══════════════════════════════════════════════════════════════

class RetryManager {
    static async executeWithRetry(fn, maxRetries = 3, context = '') {
        let lastError = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const identity = IdentityGenerator.generateFullIdentity()
                console.log(`🔄 ${context} - Jaribu ${attempt}/${maxRetries} | IP: ${identity.ip}`)

                const result = await fn(identity)
                return result
            } catch (error) {
                lastError = error
                console.log(`⚠️ ${context} - Jaribu ${attempt} imeshindwa: ${error.message}`)

                if (error.message.includes('usage limit') || error.message.includes('limit reached')) {
                    const waitTime = Math.random() * 5000 + 5000
                    console.log(`⏳ Kusubiri ${Math.round(waitTime)}ms kabla ya jaribu linalofuata...`)
                    await delay(waitTime)
                } else if (attempt < maxRetries) {
                    const waitTime = Math.random() * 2000 + 1000
                    await delay(waitTime)
                }
            }
        }

        throw lastError || new Error('Jaribu zote zimeshindwa')
    }
}

// ═══════════════════════════════════════════════════════════════
// 📤 IMAGE UPLOAD FUNCTION
// ═══════════════════════════════════════════════════════════════

async function uploadImage(imageBuffer, filename, mimeType) {
    return RetryManager.executeWithRetry(async (identity) => {
        const form = new FormData()
        form.append('image', imageBuffer, {
            filename: filename || `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`,
            contentType: mimeType || 'image/jpeg'
        })

        const response = await axios.post(
            'https://api.longhair.ai/api/v2/image/upload',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'x-product-id': '3',
                    'x-session-id': identity.fingerprint.sessionId,
                    'x-device-id': identity.fingerprint.deviceId,
                    'x-client-id': identity.fingerprint.clientId,
                    'x-visitor-id': identity.fingerprint.visitorId,
                    'x-request-id': identity.fingerprint.requestId,
                    'x-forwarded-for': identity.ip,
                    'x-real-ip': identity.ip,
                    'x-original-forwarded-for': identity.ip,
                    'access-control-allow-origin': '*',
                    'User-Agent': identity.userAgent,
                    'Accept': 'application/json',
                    'Accept-Language': `${getRandomLocale()},en-US;q=0.9,en;q=0.8`,
                    'Origin': 'https://buzz-cut.ai',
                    'Referer': 'https://buzz-cut.ai/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site'
                },
                timeout: 60000,
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024
            }
        )

        if (response.data?.code === 200 && response.data?.data?.img_name) {
            return {
                imgUrl: response.data.data.img_url,
                imgName: response.data.data.img_name
            }
        }
        throw new Error(`Jaribu la kupakia imeshindwa: ${response.data?.msg || 'Jibu sio halali'}`)
    }, 3, 'Kupakia Picha')
}

// ═══════════════════════════════════════════════════════════════
// 🎨 CREATE TANNING TASK
// ═══════════════════════════════════════════════════════════════

async function createTanTask(imgName) {
    return RetryManager.executeWithRetry(async (identity) => {
        const response = await axios.post(
            'https://api.longhair.ai/api/v2/skin-tone-filter/create',
            {
                skin_tone_type: 'bronze',
                img_name: imgName,
                timestamp: Date.now(),
                nonce: crypto.randomBytes(8).toString('hex')
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-product-id': '3',
                    'x-session-id': identity.fingerprint.sessionId,
                    'x-device-id': identity.fingerprint.deviceId,
                    'x-client-id': identity.fingerprint.clientId,
                    'x-visitor-id': identity.fingerprint.visitorId,
                    'x-request-id': identity.fingerprint.requestId,
                    'x-forwarded-for': identity.ip,
                    'x-real-ip': identity.ip,
                    'x-original-forwarded-for': identity.ip,
                    'authorization': 'null',
                    'access-control-allow-origin': '*',
                    'User-Agent': identity.userAgent,
                    'Accept': 'application/json',
                    'Accept-Language': `${getRandomLocale()},en-US;q=0.9,en;q=0.8`,
                    'Origin': 'https://buzz-cut.ai',
                    'Referer': 'https://buzz-cut.ai/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site'
                },
                timeout: 30000
            }
        )

        if (response.data?.code === 200 && response.data?.data?.job_id) {
            return response.data.data.job_id
        }
        const errorMsg = response.data?.msg || ''
        if (errorMsg.includes('limit') || errorMsg.includes('usage')) {
            throw new Error(`Kikomo cha matumizi: ${errorMsg}`)
        }

        throw new Error(`Kutengeneza kazi imeshindwa: ${errorMsg || 'Jibu sio halali'}`)
    }, 5, 'Kutengeneza Kazi ya Tanning')
}

// ═══════════════════════════════════════════════════════════════
// ⏳ POLLING FOR RESULTS
// ═══════════════════════════════════════════════════════════════

async function pollForResult(jobId, maxAttempts = 30, delayMs = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
        const identity = IdentityGenerator.generateFullIdentity()

        try {
            const response = await axios.get(
                'https://api.longhair.ai/api/v2/task/result',
                {
                    params: {
                        job_id: jobId,
                        _: Date.now()
                    },
                    headers: {
                        'x-product-id': '3',
                        'x-session-id': identity.fingerprint.sessionId,
                        'x-device-id': identity.fingerprint.deviceId,
                        'x-client-id': identity.fingerprint.clientId,
                        'x-visitor-id': identity.fingerprint.visitorId,
                        'x-request-id': identity.fingerprint.requestId,
                        'x-forwarded-for': identity.ip,
                        'x-real-ip': identity.ip,
                        'authorization': 'null',
                        'access-control-allow-origin': '*',
                        'User-Agent': identity.userAgent,
                        'Accept': 'application/json',
                        'Accept-Language': `${getRandomLocale()},en-US;q=0.9,en;q=0.8`,
                        'Origin': 'https://buzz-cut.ai',
                        'Referer': 'https://buzz-cut.ai/',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'cross-site'
                    },
                    timeout: 30000
                }
            )

            if (response.data?.code === 200 && response.data?.data) {
                const status = response.data.data.status

                if (status === 'success' && response.data.data.task_result) {
                    return response.data.data.task_result
                }

                if (status === 'failed' || status === 'error') {
                    throw new Error(`Ukagaji umeshindwa: ${response.data.data.error || 'Hitilafu isiyojulikana'}`)
                }

                console.log(`⏳ Jaribu ${i + 1}/${maxAttempts} - Hali: ${status}`)
            }
        } catch (error) {
            console.log(`⚠️ Polling jaribu ${i + 1} imeshindwa: ${error.message}`)
        }

        const jitter = Math.random() * 1000
        await delay(delayMs + jitter)
    }

    throw new Error('Muda umekoma - Hakuna matokeo')
}

// ═══════════════════════════════════════════════════════════════
// 📥 DOWNLOAD RESULT IMAGE
// ═══════════════════════════════════════════════════════════════

async function downloadResultImage(resultUrl) {
    return RetryManager.executeWithRetry(async (identity) => {
        const response = await axios.get(resultUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': identity.userAgent,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': `${getRandomLocale()},en-US;q=0.9,en;q=0.8`,
                'Referer': 'https://buzz-cut.ai/',
                'Origin': 'https://buzz-cut.ai',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 60000
        })

        return Buffer.from(response.data)
    }, 3, 'Kupakia Picha')
}

// ═══════════════════════════════════════════════════════════════
// 🌍 RANDOM LOCALE GENERATOR
// ═══════════════════════════════════════════════════════════════

function getRandomLocale() {
    const locales = [
        'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IN',
        'es-ES', 'es-MX', 'es-AR', 'es-CO',
        'fr-FR', 'fr-CA', 'fr-BE',
        'de-DE', 'de-AT', 'de-CH',
        'it-IT', 'it-CH',
        'pt-BR', 'pt-PT',
        'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA',
        'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW',
        'ru-RU', 'uk-UA', 'pl-PL', 'nl-NL',
        'sw-KE', 'sw-TZ', 'am-ET', 'ha-NG'
    ]
    return locales[Math.floor(Math.random() * locales.length)]
}

// ═══════════════════════════════════════════════════════════════
// 🎨 MAIN HANDLER - TANNING IMAGE FEATURE
// ═══════════════════════════════════════════════════════════════

const handler = async (m, { conn, command }) => {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || ''

    // Main Command
    if (command === 'تزنيج-صورة' || command === 'tan-image' || command === 'تسمير-البشرة' || command === 'tanning') {
        if (!mime || !mime.startsWith('image/')) {
            return m.reply(
                `╔═══════════════════════════════════╗
║      ☀️ AI TANNING IMAGE TOOL     ║
╚═══════════════════════════════════╝

*📌 Jinsi ya Kutumia:*
• Jaribu amri hii kwa kujibu kwenye picha
• Mfano: \`.تزنيج-صورة\`

*🎨 Mifano ya Amri:*
\`\`\`
.tan-image (jibu picha)
.تزنيج-صورة (jibu picha)  
.تسمير-البشرة (jibu picha)
.tanning (jibu picha)
\`\`\`

*⚙️ Sifa:*
✨ AI-powered skin tone adjustment
🚀 Kasi na usalama wa juu
🔒 Anti-detection system
📊 Hifadhi ya picha imboreshwa
🌍 Inasupporta picha za kila ukubwa

*⏱️ Muda wa Kazi:* ~30-60 sekunde
*📁 Ukubwa wa Max:* 100MB

*💡 Ujumbe:* Picha yako inaproseswa kwa usalama
`
            )
        }

        // Start Processing
        await m.react('⏳')
        
        const processingMsg = await m.reply(
            `╔════════════════════════════════════╗
║    🔄 INAKAGUA PICHA YAKO...       ║
╚════════════════════════════════════╝

*Marhabani!* Picha yako inakaagua...
⏱️ Hii inaweza kuchukua 30-60 sekunde

*Hadharani:*
📤 Kupakia picha
🎨 Kusanidi tone ya ngozi  
⏳ Kusubiri matokeo
📥 Kupakia matokeo

Karibu subiri... 🔄`
        )

        try {
            // Download image
            const buffer = await q.download()
            if (!buffer || buffer.length === 0) throw new Error('Imeshindwa kupakua picha')

            // Get file type
            const fileInfo = fileTypeFromBuffer ? await fileTypeFromBuffer(buffer) : null
            const ext = fileInfo?.ext || 'jpg'
            const mimeType = fileInfo?.mime || 'image/jpeg'
            const sizeKB = (buffer.length / 1024).toFixed(2)

            console.log(`📊 Picha: ${sizeKB}KB | Aina: ${ext}`)

            // Send size info
            await m.react('📊')
            await m.reply(`📊 *Ukubwa wa Picha:* ${sizeKB} KB\n✨ *Aina:* ${mimeType}`)

            // Upload
            await m.react('📤')
            await m.reply('📤 *Kupakia picha kwenye seva...*')
            const uploadResult = await uploadImage(
                buffer,
                `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`,
                mimeType
            )
            console.log('✅ Upload successful:', uploadResult.imgName)

            // Wait before next step
            await delay(Math.random() * 2000 + 1000)

            // Create task
            await m.react('🎨')
            await m.reply('🎨 *Kutengeneza kazi ya tanning...*')
            const jobId = await createTanTask(uploadResult.imgName)
            console.log('✅ Task created:', jobId)

            // Poll for results
            await m.react('⏳')
            await m.reply('⏳ *Kusubiri matokeo... (Hii inaweza kuchukua 30-60 sekunde)*')
            const resultUrl = await pollForResult(jobId, 30, 3000)
            console.log('✅ Results ready:', resultUrl)

            // Download result
            await m.react('📥')
            await m.reply('📥 *Kupakia matokeo...*')
            const resultBuffer = await downloadResultImage(resultUrl)

            // Send final image
            await conn.sendMessage(m.chat, {
                image: resultBuffer,
                caption: `╔════════════════════════════════════╗
║     ☀️ TANNING SUCCESS! ✅         ║
╚════════════════════════════════════╝

🎨 *Picha yako imechakatwa kwa mafanikio!*

📊 *Takwimu:*
• 📥 Ingizo: ${sizeKB} KB
• 📤 Matokeo: ${(resultBuffer.length / 1024).toFixed(2)} KB
• ⚡ Wakati: ~${Math.round((Date.now() - m.messageTimestamp?.low || 0) / 1000)} sec
• 🌐 Chanzo: buzz-cut.ai AI

✨ *Picha imepokea tone ya ngozi ya kawaida!*
🎯 Matokeo yanajitokeza na ya asili

*Karibu ujaribu tena!* 🔄`
            }, { quoted: m })

            await m.react('✅')
            console.log('✅ Command completed successfully')

        } catch (error) {
            console.error('❌ Processing error:', error)
            await m.react('❌')

            let errorMsg = error.message
            let emoji = '❌'
            let solution = ''

            // Smart error messages
            if (errorMsg.includes('usage limit') || errorMsg.includes('limit reached')) {
                emoji = '⏸️'
                solution = '🔄 *Suluhisho:* Jaribu baada ya dakika 5-10\n💡 Au subiri hadi kesho kwa idadi mpya'
            } else if (errorMsg.includes('timeout') || errorMsg.includes('Muda umekoma')) {
                emoji = '⏳'
                solution = '🔄 *Suluhisho:* Seva inakumbukwa, jaribu tena\n💡 Au sumbua kwa dakika michache'
            } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
                emoji = '🌐'
                solution = '🔄 *Suluhisho:* Angalia muunganisho wa mtandao\n💡 Jaribu kutoka tena kwa bweni tofauti'
            } else if (errorMsg.includes('invalid') || errorMsg.includes('mime')) {
                emoji = '🖼️'
                solution = '🔄 *Suluhisho:* Tumia picha nyingine (JPG/PNG)\n💡 Picha lazima iwe sahihi'
            } else {
                solution = '🔄 *Suluhisho:* Jaribu picha ndogo au tofauti\n💡 Hakikisha muunganisho mzuri wa internet'
            }

            return m.reply(
                `╔════════════════════════════════════╗
║        ${emoji} KOSA LIMEFANYIKA          ║
╚════════════════════════════════════╝

*${emoji} Hitilafu:* ${errorMsg}

${solution}

*📞 Msaada:* Tafadhali jaribu tena, au wasiliana na admin`
            )
        }
        return
    }

    // Help message
    return m.reply(
        `╔═══════════════════════════════════╗
║    ☀️ TANNING IMAGE COMMANDS      ║
╚═══════════════════════════════════╝

*🎯 Amri za Msingi:*
1. \`.تزنيج-صورة\` - Tanning standard
2. \`.tan-image\` - English variant
3. \`.تسمير-البشرة\` - Alternate Arabic
4. \`.tanning\` - Simple command

*📝 Jinsi ya Kutumia:*
• Jibu picha: \`.tan-image\`
• Picha itakachagwa kwa haba
• Matokeo yatajitokeza katika sekunde 30-60

*✨ Kile Kinachoweza Kufanya:*
✓ Kubadilisha tone ya ngozi
✓ AI-powered image enhancement
✓ Kasi ya kuprosesa
✓ Matokeo ya juu ya kalidad

*⚠️ Maelezo Muhimu:*
⏱️ Muda wa Kazi: 30-60 sekunde
📁 Max Ukubwa: 100MB
🔒 Picha ni siri na salama
🌐 Mfumo: buzz-cut.ai

*💡 Nani anaweza kutumia?*
✓ Watumiaji wote
✓ Hakuna kikomo cha kila saa
✓ Rasilimali halisi

*❓ Matatizo?*
• Jaribu picha ndogo zaidi
• Angalia muunganisho wa mtandao
• Subiri dakika 5-10 kisha jaribu tena

Karibu jaribu! 🎨✨`
    )
}

// Export handler
handler.command = ['تزنيج-صورة', 'tan-image', 'تسمير-البشرة', 'tanning']
handler.help = ['تزنيج-صورة <reply image>']
handler.tags = ['tools', 'ai', 'image']
handler.limit = true

module.exports = handler
module.exports.default = handler

// ==============================================
// 🎬 LIVE SAMPLES ZA NIXELLV2 (ZENYE CONTENT HALISI)
// ==============================================

// Function ya ku-run live samples kutoka pastebin
async function showNixellLiveSample(sock, chatId, msg, example, content) {
    try {
        if (!content) return false;

        // SAVE MESSAGE KWA AJILI YA KUFUTA BAADAYE
        if (!userMessages[chatId]) userMessages[chatId] = [];
        userMessages[chatId].push(msg);

        // Kama kodi ina muundo wa relayMessage au interactiveMessage, itakuwa executed kama live sample
        if (content.includes('relayMessage') || content.includes('interactiveMessage') || 
            content.includes('documentMessage') || content.includes('stickerMessage')) {
            try {
                const sanitizedContent = content
                    .replace(/sock\.sendMessage/g, 'sock?.sendMessage')
                    .replace(/sock\.relayMessage/g, 'sock?.relayMessage');

                const runTemplate = new Function('sock', 'chatId', 'msg', 'baileys', `
                    const conn = sock; 
                    const m = { chat: chatId };
                    try {
                        ${sanitizedContent}
                    } catch(err) {
                        console.error("Internal template runtime error:", err);
                        return false;
                    }
                    return true;
                `);
                return await runTemplate(sock, chatId, msg, baileys) || false;
            } catch (e) {
                console.error("❌ Imeshindwa ku-render live template kutoka pastebin:", e.message);
                return false;
            }
        }

        // Hardcoded options kwa ajili ya usalama wa ziada
        const title = example.title.toLowerCase();

        // ==============================================
        // 🆕 SINGLE SELECT WITH BUTTONV2 (FEATURE KALI)
        // ==============================================
        if (title.includes('single select') || title.includes('select')) {
            try {
                // SINGLE SELECT USING BUTTONV2
                const singleSelectBtn = await new ButtonV2(sock)
                    .setBody('🔘 *Single Select Demo*\n\nChagua moja kati ya chaguzi zifuatazo:')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg')
                    .addRawButton({
                        buttonText: { displayText: '📋 Chagua Option' },
                        buttonId: 'single_select_demo',
                        type: 1,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: '🔘 Chagua Chaguo Lako',
                                sections: [{
                                    title: '📌 Main Options',
                                    highlight_label: '⬇️ Chagua',
                                    rows: [
                                        {
                                            header: '🔹',
                                            title: 'Option 1 - Core',
                                            description: 'Inaonyesha mifano ya msingi',
                                            id: 'option_core'
                                        },
                                        {
                                            header: '🔸',
                                            title: 'Option 2 - Advanced',
                                            description: 'Inaonyesha mifano ya hali ya juu',
                                            id: 'option_advanced'
                                        },
                                        {
                                            header: '🔹',
                                            title: 'Option 3 - Premium',
                                            description: 'Inaonyesha mifano ya premium',
                                            id: 'option_premium'
                                        }
                                    ]
                                },
                                {
                                    title: '🎯 Quick Actions',
                                    highlight_label: '⚡',
                                    rows: [
                                        {
                                            header: '📚',
                                            title: 'View All Examples',
                                            description: 'Ona mifano yote',
                                            id: 'view_all'
                                        },
                                        {
                                            header: '🔄',
                                            title: 'Refresh Menu',
                                            description: 'Pakua mifano mpya',
                                            id: 'refresh_menu'
                                        }
                                    ]
                                }]
                            })
                        }
                    })
                    .send(chatId, { quoted: msg });

                userMessages[chatId].push(singleSelectBtn);
                
                // Tuma pia code example
                const codeMsg = await sock.sendMessage(chatId, {
                    text: '```javascript\n' +
                          '// 🆕 SINGLE SELECT WITH BUTTONV2\n' +
                          'await new ButtonV2(conn)\n' +
                          '    .setBody("🔘 Chagua moja kati ya chaguzi:")\n' +
                          '    .setFooter("⚡ Mickey Glitch Sub")\n' +
                          '    .setThumbnail("https://example.com/image.jpg")\n' +
                          '    .addRawButton({\n' +
                          '        buttonText: { displayText: "📋 Chagua Option" },\n' +
                          '        buttonId: "single_select_demo",\n' +
                          '        type: 1,\n' +
                          '        nativeFlowInfo: {\n' +
                          '            name: "single_select",\n' +
                          '            paramsJson: JSON.stringify({\n' +
                          '                title: "🔘 Chagua Chaguo Lako",\n' +
                          '                sections: [{\n' +
                          '                    title: "📌 Main Options",\n' +
                          '                    highlight_label: "⬇️ Chagua",\n' +
                          '                    rows: [\n' +
                          '                        { header: "🔹", title: "Option 1", description: "Maelezo", id: "opt1" },\n' +
                          '                        { header: "🔸", title: "Option 2", description: "Maelezo", id: "opt2" }\n' +
                          '                    ]\n' +
                          '                }]\n' +
                          '            })\n' +
                          '        }\n' +
                          '    })\n' +
                          '    .send(chatId);\n' +
                          '```'
                }, { quoted: msg });
                userMessages[chatId].push(codeMsg);
                return true;
            } catch (sampleError) {
                console.error('❌ Single select sample failed:', sampleError.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 MULTI-SELECT WITH BUTTONV2
        // ==============================================
        if (title.includes('multi select')) {
            try {
                const multiSelectBtn = await new ButtonV2(sock)
                    .setBody('☑️ *Multi-Select Demo*\n\nChagua chaguo nyingi:')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg')
                    .addRawButton({
                        buttonText: { displayText: '☑️ Chagua Nyingi' },
                        buttonId: 'multi_select_demo',
                        type: 1,
                        nativeFlowInfo: {
                            name: 'multi_select',
                            paramsJson: JSON.stringify({
                                title: '☑️ Chagua Chaguo Nyingi',
                                sections: [{
                                    title: '📌 Features',
                                    highlight_label: '✅',
                                    rows: [
                                        { header: '🚀', title: 'Feature 1 - Speed', description: 'Inaharakisha processing', id: 'feat_speed' },
                                        { header: '🔒', title: 'Feature 2 - Security', description: 'Inalinda data zako', id: 'feat_security' },
                                        { header: '🎨', title: 'Feature 3 - Design', description: 'Inaboresha UI/UX', id: 'feat_design' }
                                    ]
                                }]
                            })
                        }
                    })
                    .send(chatId, { quoted: msg });

                userMessages[chatId].push(multiSelectBtn);
                return true;
            } catch (error) {
                console.error('❌ Multi-select failed:', error.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 BUTTONV2 WITH CTA URL & COPY (FEATURE KALI)
        // ==============================================
        if (title.includes('buttonv2') || title.includes('cta')) {
            try {
                const advancedBtn = await new ButtonV2(sock)
                    .setTitle('🚀 Advanced ButtonV2 Demo')
                    .setBody('📋 *ButtonV2 with Multiple Features*\n\n' +
                            '👤 Username: demo_user\n' +
                            '🔑 Password: demo_pass123\n' +
                            '🌐 Panel: https://panel.example.com\n\n' +
                            '💡 *Click buttons below to interact*')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg')
                    
                    // CTA COPY
                    .addButton({
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Copy Username',
                            copy_code: 'demo_user',
                            id: 'copy_user'
                        })
                    })
                    .addButton({
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🔑 Copy Password',
                            copy_code: 'demo_pass123',
                            id: 'copy_pass'
                        })
                    })
                    
                    // CTA URL
                    .addRawButton({
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🌐 Open Panel',
                            url: 'https://panel.example.com',
                            webview_interaction: false
                        })
                    })
                    
                    // Quick Reply
                    .addRawButton({
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Menu',
                            id: '.source'
                        })
                    })
                    .send(chatId, { quoted: msg });

                userMessages[chatId].push(advancedBtn);
                return true;
            } catch (error) {
                console.error('❌ ButtonV2 advanced failed:', error.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 CAROUSEL WITH MULTIPLE CARDS
        // ==============================================
        if (title.includes('carousel')) {
            try {
                const carousel = new Carousel(sock);
                carousel
                    .setTitle('🎠 Carousel Demo')
                    .setBody('📋 *Multiple Cards Display*')
                    .setFooter('⚡ Mickey Glitch Sub')
                    .addCard({
                        header: {
                            title: '📦 Package 1',
                            hasMediaAttachment: true,
                            imageMessage: {
                                url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
                                mimetype: 'image/png'
                            }
                        },
                        body: {
                            text: '🔹 *Basic Package*\nRAM: 1GB\nCPU: 100%\nPrice: TSh 5,000'
                        },
                        footer: {
                            text: '⚡ Mickey Glitch Sub'
                        }
                    })
                    .addCard({
                        header: {
                            title: '🚀 Package 2',
                            hasMediaAttachment: true,
                            imageMessage: {
                                url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
                                mimetype: 'image/png'
                            }
                        },
                        body: {
                            text: '🔸 *Premium Package*\nRAM: 4GB\nCPU: 300%\nPrice: TSh 15,000'
                        },
                        footer: {
                            text: '⚡ Mickey Glitch Sub'
                        }
                    });

                const sent = await carousel.send(chatId, { quoted: msg });
                userMessages[chatId].push(sent);
                return true;
            } catch (error) {
                console.error('❌ Carousel failed:', error.message);
                return false;
            }
        }

        // ==============================================
        // 🆕 AIRICH WITH TEMPLATE
        // ==============================================
        if (title.includes('airich') || title.includes('rich')) {
            try {
                const rich = new AIRich(sock)
                    .setTitle('💎 Rich Message Demo')
                    .setBody(
                        '📋 *Rich Message with Template*\n\n' +
                        '👤 User: @Mickey\n' +
                        '📅 Date: 25/07/2026\n' +
                        '✅ Status: Active\n\n' +
                        '📌 *Features:*\n' +
                        '• Interactive UI\n' +
                        '• Rich formatting\n' +
                        '• Template support'
                    )
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setTemplate(1);

                const sent = await rich.send(chatId, { quoted: msg });
                userMessages[chatId].push(sent);
                return true;
            } catch (error) {
                console.error('❌ AIRich failed:', error.message);
                return false;
            }
        }

        // THUMBNAIL EDIT (tmte)
        if (title.includes('thumbnail edit') || title.includes('tmte')) {
            const imgUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
            try {
                const media = await baileys.prepareWAMessageMedia({ image: { url: imgUrl } }, { 
                    upload: sock.waUploadToServer, 
                    mediaTypeOverride: 'thumbnail-link' 
                });
                const sentMsg = await sock.sendMessage(chatId, {
                    text: '🖼️ *Thumbnail Edit Live Sample*\n\nInaonyesha jinsi ya kubadilisha thumbnail ya link...',
                    linkPreview: {
                        'matched-text': 'https://example.com',
                        title: 'Thumbnail Edit Demo',
                        jpegThumbnail: media.imageMessage.jpegThumbnail,
                        highQualityThumbnail: media.imageMessage
                    }
                }, { quoted: msg });
                userMessages[chatId].push(sentMsg);
                return true;
            } catch (mediaError) {
                console.error('❌ Error preparing thumbnail media:', mediaError);
                return false;
            }
        }

        // TO STICKERPACK (tspk)
        else if (title.includes('stickerpack') || title.includes('tspk')) {
            const stickerUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
            try {
                const media = await baileys.prepareWAMessageMedia({ image: { url: stickerUrl } }, { 
                    upload: sock.waUploadToServer 
                });
                const sentMsg = await sock.sendMessage(chatId, {
                    sticker: media,
                    contextInfo: { isStickerPack: true }
                }, { quoted: msg });
                userMessages[chatId].push(sentMsg);
                return true;
            } catch (mediaError) {
                console.error('❌ Error preparing sticker media:', mediaError);
                return false;
            }
        }

        // GROUP ADD META AI
        else if (title.includes('group') && title.includes('meta')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '👥 *Group Add Meta AI Live Sample*\n\nSimulizi ya kuongeza AI kwenye kikundi...\n\n📌 *Code Sample:*\n```javascript\nconst addMetaAI = async (groupId) => {\n  // Code ya kuongeza Meta AI\n  await sock.groupAdd(groupId, [metaAI]);\n};\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // STICKER (SPREM)
        else if (title.includes('sticker') && title.includes('sprem')) {
            const stickerUrl = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg";
            try {
                const media = await baileys.prepareWAMessageMedia({ image: { url: stickerUrl } }, { 
                    upload: sock.waUploadToServer 
                });
                const sentMsg = await sock.sendMessage(chatId, {
                    sticker: media,
                    contextInfo: { isStickerPack: false }
                }, { quoted: msg });
                userMessages[chatId].push(sentMsg);
                return true;
            } catch (mediaError) {
                console.error('❌ Error preparing sticker media:', mediaError);
                return false;
            }
        }

        // LATEX
        else if (title.includes('latex')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '📐 *LaTeX Live Sample*\n\n`E = mc²`\n`∫₀¹ x² dx = ⅓`\n`\\frac{-b ± √(b²-4ac)}{2a}`\n\n*Formulas:*\n`\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}`\n`\\lim_{x\\to\\infty} f(x)`\n\n📝 *Code:*\n```javascript\nconst latex = new LaTeX(sock)\n  .setFormula("E = mc^2")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // GALAXY MESSAGE
        else if (title.includes('galaxy')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '🌌 *Galaxy Message Live Sample*\n\n✨ Ujumbe wa kimajini!\n⭐ Nyota zinang\'aa\n🌟 Galaxy inakungoja...\n\n📝 *Code:*\n```javascript\nconst galaxy = new Galaxy(sock)\n  .setMessage("✨ Ujumbe wa kimajini!")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // REVIEW AND PAY
        else if (title.includes('review') && title.includes('pay')) {
            const reviewBtn = new Button(sock)
                .setTitle('💳 Review & Pay')
                .setBody('Tathmini na malipo:')
                .addReply('✅ Review Order', '.source review_order')
                .addReply('💳 Pay Now', '.source pay_now');
            const sentMsg = await reviewBtn.send(chatId, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // INAPP SIGNUP
        else if (title.includes('inapp signup')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '📝 *InApp Signup Live Sample*\n\nJisajili ndani ya app:\n👤 Jina lako\n📧 Barua pepe\n🔑 Nenosiri\n\n📝 *Code:*\n```javascript\nconst signup = new Signup(sock)\n  .setFields(["Jina", "Barua pepe", "Nenosiri"])\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // BOOKING CONFIRMATION
        else if (title.includes('booking confirmation')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '✅ *Booking Confirmation Live Sample*\n\nBooking #12345 imethibitishwa!\n📅 Tarehe: 25 July 2026\n🕐 Saa: 14:30\n📍 Mahali: Dar es Salaam\n\n📝 *Code:*\n```javascript\nconst booking = new Booking(sock)\n  .setId("12345")\n  .setDate("25 July 2026")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        // PAYMENT KEY INFO
        else if (title.includes('payment key')) {
            const sentMsg = await sock.sendMessage(chatId, {
                text: '🔑 *Payment Key Info Live Sample*\n\nMaelezo ya malipo:\n💰 Kiasi: TSh 50,000\n🔢 Namba: 1234-5678-9012\n📅 Tarehe: 25/07/2026\n\n📝 *Code:*\n```javascript\nconst payment = new Payment(sock)\n  .setAmount("TSh 50,000")\n  .setKey("1234-5678-9012")\n  .send(chatId);\n```'
            }, { quoted: msg });
            userMessages[chatId].push(sentMsg);
            return true;
        }

        return false; 
    } catch (error) {
        console.error('❌ Live sample error:', error);
        return false;
    }
}

// ==============================================
// 🚀 MAIN SOURCE COMMAND
// ==============================================

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    // Initialize user messages
    if (!userMessages[chatId]) userMessages[chatId] = [];

    // Raw links za picha na video
    const img1 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg";
    const img2 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg";
    const img3 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg";
    const img4 = "https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg";
    const sampleVideo = "https://d.uguu.se/fWnUWKVq.mp4";

    // ─── 1. MENU KUU ───
    if (!input) {
        try {
            // Futa messages zote za nyuma
            await deletePreviousMessages(sock, chatId, userMessages[chatId]);
            userMessages[chatId] = [];

            const nixellExamples = await fetchNixellExamples();

            // ==============================================
            // 🆕 MENU KUU WITH BUTTONV2 SINGLE SELECT
            // ==============================================
            const mainMenu = await new ButtonV2(sock)
                .setTitle('🧩 Mickey Glitch Lab v5.0')
                .setBody('🌟 *Core & Advanced Engine*\n\n' +
                        '📌 *Available Features:*\n' +
                        '• Core: Buttons & Flow\n' +
                        '• Advanced: Media Hacks\n' +
                        `• Nixellv2: ${nixellExamples.length} examples\n\n` +
                        '💡 *Select an option below:*')
                .setFooter('⚡ MICKEY BOT v5.0')
                .setThumbnail(img1)
                
                // SINGLE SELECT FOR MAIN MENU
                .addRawButton({
                    buttonText: { displayText: '📋 Open Menu' },
                    buttonId: 'main_menu_select',
                    type: 1,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: '🧩 Mickey Glitch Lab Menu',
                            sections: [
                                {
                                    title: '📁 Core Features',
                                    highlight_label: '⬇️',
                                    rows: [
                                        {
                                            header: '📁',
                                            title: 'Core: Buttons & Flow',
                                            description: 'Mifano ya buttons na flows',
                                            id: 'kundi_core'
                                        },
                                        {
                                            header: '🚀',
                                            title: 'Advanced: Media Hacks',
                                            description: 'Mifano ya media na hacks',
                                            id: 'kundi_advanced'
                                        }
                                    ]
                                },
                                {
                                    title: '📚 Nixellv2 Examples',
                                    highlight_label: '🔥',
                                    rows: (nixellExamples.length > 0 ? [
                                        {
                                            header: '📚',
                                            title: `View ${nixellExamples.length} Examples`,
                                            description: 'Ona mifano yote kutoka Nixellv2',
                                            id: 'nixell_menu'
                                        }
                                    ] : [])
                                },
                                {
                                    title: '⚡ Quick Actions',
                                    highlight_label: '⚡',
                                    rows: [
                                        {
                                            header: '🔄',
                                            title: 'Refresh Examples',
                                            description: 'Pakua mifano mpya',
                                            id: 'refresh'
                                        },
                                        {
                                            header: '❌',
                                            title: 'Close Menu',
                                            description: 'Funga menu hii',
                                            id: 'close'
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                })
                .send(chatId, { quoted: ctx._msg });

            userMessages[chatId].push(mainMenu);
            return;
        } catch (e) {
            console.error('Error kwenye menu kuu:', e);
            await sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kufungua Tester Menu.' }, { quoted: ctx._msg });
            return;
        }
    }

    // ─── CLOSE MENU ───
    if (input === 'close') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];
        await sock.sendMessage(ctx.chatId, { text: '✅ Menu imefungwa. Tuma .source tena kufungua.' }, { quoted: ctx._msg });
        return;
    }

    // ─── REFRESH EXAMPLES ───
    if (input === 'refresh') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const sentMsg = await sock.sendMessage(ctx.chatId, { text: '🔄 Inapakua mifano mpya kutoka Nixellv2...' }, { quoted: ctx._msg });
        userMessages[chatId].push(sentMsg);

        const examples = await fetchNixellExamples();
        if (examples.length > 0) {
            const sentMsg2 = await sock.sendMessage(ctx.chatId, { 
                text: `✅ Imepakua ${examples.length} mifano mpya!\nTumia .source nixell_menu kuona orodha.` 
            }, { quoted: ctx._msg });
            userMessages[chatId].push(sentMsg2);
        } else {
            const sentMsg2 = await sock.sendMessage(ctx.chatId, { text: '❌ Imeshindwa kupakua mifano. Jaribu tena.' }, { quoted: ctx._msg });
            userMessages[chatId].push(sentMsg2);
        }
        return;
    }

    // ─── NIXELLV2 MENU ───
    if (input === 'nixell_menu') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const examples = await fetchNixellExamples();
        if (examples.length === 0) {
            const sentMsg = await sock.sendMessage(ctx.chatId, { 
                text: '❌ Hakuna mifano iliyopatikana. Jaribu .source refresh' 
            }, { quoted: ctx._msg });
            userMessages[chatId].push(sentMsg);
            return;
        }

        // Panga mifano kwa makundi
        const stickerExamples = examples.filter(ex => ex.title.toLowerCase().includes('sticker'));
        const interactiveExamples = examples.filter(ex => ex.title.toLowerCase().includes('interactive') || ex.title.toLowerCase().includes('message'));
        const otherExamples = examples.filter(ex => !stickerExamples.includes(ex) && !interactiveExamples.includes(ex));

        // ==============================================
        // 🆕 NIXELL MENU WITH SINGLE SELECT
        // ==============================================
        const nixellMenu = await new ButtonV2(sock)
            .setTitle('📚 Nixellv2 Live Samples')
            .setBody(`🎯 *Mifano ${examples.length} zilizopatikana*\n\n` +
                    `📌 *Stickers:* ${stickerExamples.length} mifano\n` +
                    `📌 *Interactive:* ${interactiveExamples.length} mifano\n` +
                    `📌 *Other:* ${otherExamples.length} mifano\n\n` +
                    `📝 Select an example below to view live sample + code`)
            .setFooter('⚡ MICKEY BOT • Nixellv2 Collection')
            .setThumbnail(img2)
            .addRawButton({
                buttonText: { displayText: '📋 View Examples' },
                buttonId: 'nixell_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '📚 Nixellv2 Examples',
                        sections: [
                            {
                                title: '🎨 Sticker Examples',
                                highlight_label: '⬇️',
                                rows: stickerExamples.slice(0, 5).map((ex, i) => ({
                                    header: '🎨',
                                    title: ex.title.substring(0, 30),
                                    description: `Added: ${ex.added}`,
                                    id: `nixell_${examples.indexOf(ex)}`
                                }))
                            },
                            {
                                title: '💬 Interactive Examples',
                                highlight_label: '💬',
                                rows: interactiveExamples.slice(0, 5).map((ex, i) => ({
                                    header: '💬',
                                    title: ex.title.substring(0, 30),
                                    description: `Added: ${ex.added}`,
                                    id: `nixell_${examples.indexOf(ex)}`
                                }))
                            },
                            {
                                title: '📄 Other Examples',
                                highlight_label: '📄',
                                rows: otherExamples.slice(0, 5).map((ex, i) => ({
                                    header: '📄',
                                    title: ex.title.substring(0, 30),
                                    description: `Added: ${ex.added}`,
                                    id: `nixell_${examples.indexOf(ex)}`
                                }))
                            }
                        ]
                    })
                }
            })
            .send(chatId, { quoted: ctx._msg });

        userMessages[chatId].push(nixellMenu);
        return;
    }

    // ─── KUNDI CORE ───
    if (input === 'kundi_core') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const coreMenu = await new ButtonV2(sock)
            .setTitle('📁 Core Features')
            .setBody('📌 *Basic & Advanced Buttons*\n\n' +
                    '• Single Select Demo\n' +
                    '• Multi-Select Demo\n' +
                    '• ButtonV2 with CTA\n' +
                    '• Quick Reply Buttons')
            .setFooter('⚡ Mickey Glitch Sub')
            .setThumbnail(img3)
            .addRawButton({
                buttonText: { displayText: '📋 Select Feature' },
                buttonId: 'core_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '📁 Core Features',
                        sections: [{
                            title: '📌 Available Features',
                            highlight_label: '⬇️',
                            rows: [
                                { header: '🔘', title: 'Single Select Demo', description: 'Onesha single select', id: 'nixell_0' },
                                { header: '☑️', title: 'Multi-Select Demo', description: 'Onesha multi select', id: 'nixell_1' },
                                { header: '🚀', title: 'ButtonV2 Advanced', description: 'CTA Copy & URL', id: 'nixell_2' }
                            ]
                        }]
                    })
                }
            })
            .send(chatId, { quoted: ctx._msg });

        userMessages[chatId].push(coreMenu);
        return;
    }

    // ─── KUNDI ADVANCED ───
    if (input === 'kundi_advanced') {
        await deletePreviousMessages(sock, chatId, userMessages[chatId]);
        userMessages[chatId] = [];

        const advancedMenu = await new ButtonV2(sock)
            .setTitle('🚀 Advanced Features')
            .setBody('📌 *Media & Rich Content*\n\n' +
                    '• Carousel Demo\n' +
                    '• AIRich Template\n' +
                    '• Thumbnail Edit\n' +
                    '• Sticker Pack')
            .setFooter('⚡ Mickey Glitch Sub')
            .setThumbnail(img4)
            .addRawButton({
                buttonText: { displayText: '📋 Select Feature' },
                buttonId: 'advanced_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '🚀 Advanced Features',
                        sections: [{
                            title: '📌 Available Features',
                            highlight_label: '⬇️',
                            rows: [
                                { header: '🎠', title: 'Carousel Demo', description: 'Multiple cards display', id: 'nixell_3' },
                                { header: '💎', title: 'AIRich Template', description: 'Rich message with template', id: 'nixell_4' },
                                { header: '🖼️', title: 'Thumbnail Edit', description: 'Edit link thumbnails', id: 'nixell_5' }
                            ]
                        }]
                    })
                }
            })
            .send(chatId, { quoted: ctx._msg });

        userMessages[chatId].push(advancedMenu);
        return;
    }

    // ─── NIXELLV2 LIVE SAMPLE ───
    if (input.startsWith('nixell_')) {
        const index = parseInt(input.split('_')[1]);
        const examples = await fetchNixellExamples();
        
        if (isNaN(index) || index >= examples.length) {
            await sock.sendMessage(ctx.chatId, { 
                text: '❌ Sample haipatikani. Jaribu .source refresh' 
            }, { quoted: ctx._msg });
            return;
        }

        const example = examples[index];
        await sock.sendMessage(ctx.chatId, { 
            text: `📥 Inapakua: ${example.title}...` 
        }, { quoted: ctx._msg });

        const content = await fetchPasteContent(example.id);
        if (!content) {
            await sock.sendMessage(ctx.chatId, { 
                text: `❌ Imeshindwa kupata content ya ${example.title}` 
            }, { quoted: ctx._msg });
            return;
        }

        await showNixellLiveSample(sock, chatId, msg, example, content);
        return;
    }

    // ─── DEFAULT ───
    await sock.sendMessage(ctx.chatId, { 
        text: '❌ Amri haijulikani. Tuma .source kuona menu.' 
    }, { quoted: ctx._msg });
};

module.exports = sourceCommand;