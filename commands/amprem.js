import axios from 'axios'

const BASE_URL = 'https://am.yappi.my.id'
const COOKIE_API = `${BASE_URL}/api/cookie`
const SEND_API = `${BASE_URL}/api/send`
const VERIFY_API = `${BASE_URL}/api/verify`

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'

let GLOBAL_COOKIE = ''

// ===== HELPER FUNCTIONS =====

// 1. Kuchukua Cookie kutoka API
async function getCookie() {
  try {
    const res = await axios.get(COOKIE_API, {
      timeout: 15000,
      headers: { 'User-Agent': USER_AGENT, 'Accept': '*/*' }
    })

    if (res.data?.ok && res.data?.cookie) {
      GLOBAL_COOKIE = res.data.cookie
      return GLOBAL_COOKIE
    }
    throw new Error(res.data?.error || 'Imeshindikana kupata cookie ya session')
  } catch (e) {
    throw new Error(e.response?.data?.error || e.message || 'Cookie API Error')
  }
}

// 2. Kutuma Magic Link kwenda kwenye Email
async function sendMagicLink(email, cookie) {
  try {
    const res = await axios.post(
      SEND_API,
      { email, cookie },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Origin': BASE_URL,
          'Referer': `${BASE_URL}/`,
          'User-Agent': USER_AGENT,
          'Accept': '*/*'
        }
      }
    )

    if (res.data?.ok) {
      return { success: true, data: res.data }
    }
    return { success: false, error: res.data?.error || res.data?.message || 'Imeshindikana kutuma Magic Link' }
  } catch (e) {
    return { success: false, error: e.response?.data?.error || e.response?.data?.message || e.message || 'Send API Error' }
  }
}

// 3. Kuhakiki (Verify) Magic Link
async function verifyMagicLink(email, link, cookie) {
  try {
    const res = await axios.post(
      VERIFY_API,
      { email, link, cookie },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Origin': BASE_URL,
          'Referer': `${BASE_URL}/`,
          'User-Agent': USER_AGENT,
          'Accept': '*/*'
        }
      }
    )

    if (res.data?.ok) {
      return { success: true, data: res.data }
    }
    return { success: false, error: res.data?.error || res.data?.message || 'Uhakiki umeshindikana' }
  } catch (e) {
    return { success: false, error: e.response?.data?.error || e.response?.data?.message || e.message || 'Verify API Error' }
  }
}

// ===== MAIN COMMAND HANDLER =====

const handler = async (m, { conn, text }) => {
  if (!text) {
    return m.reply(
`📌 *Alight Motion Premium Activator*

*1. Jinsi ya kutuma Magic Link:*
.amprem email@gmail.com

*2. Jinsi ya kuthibitisha (Verify):*
.amprem email@gmail.com|https://magic-link-yako

*Hatua:*
Tuma email yako kwanza, kisha fungua Email uliyopokea kutoka AM, copy hiyo Magic Link halafu tuma tena hapa ukiiseparate na '|'.`
    )
  }

  let email = text.trim()
  let link = null

  // Kutenganisha Email na Link kama mtumiaji ameweka '|'
  if (text.includes('|')) {
    const split = text.split('|').map(v => v.trim())
    email = split[0]
    link = split.slice(1).join('|').trim() || null
  }

  // Uhakiki wa Format ya Email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return m.reply(`❌ *Format ya email siyo sahihi!*\n\nMfano: .amprem user@gmail.com`)
  }

  // Ujumbe wa Subira
  await conn.sendMessage(m.chat, { text: '⏳ Inachakata, tafadhali subiri...' }, { quoted: m })

  // --- HATUA YA 1: KUTUMA LINK (Kama hakuna Link iliyowekwa) ---
  if (!link) {
    try {
      const cookie = await getCookie()
      const result = await sendMagicLink(email, cookie)

      if (!result.success) {
        return m.reply(`❌ *Imeshindikana*\n\n${result.error}`)
      }

      return m.reply(
`✅ *Magic Link Imeshatumwa Kwa Mafanikio!*

📧 *Email:* ${email}
📬 *Status:* Link ya uhakiki imetumwa

📌 *Hatua zinazofuata:*
1. Angalia Inbox kwenye Email yako
2. Angalia folder la Spam kama huioni
3. Copy link ya verfication kutoka Alight Motion
4. Tuma link hiyo hapa kwa kutumia mfumo huu:

.amprem ${email}|LINK_ULIYO_COPY`
      )
    } catch (e) {
      return m.reply(`❌ *Kosa:* ${e.message}`)
    }
  }

  // --- HATUA YA 2: VERIFY LINK (Kama mtumiaji ameweka Link) ---
  try {
    const cookie = GLOBAL_COOKIE || (await getCookie())
    const result = await verifyMagicLink(email, link, cookie)

    if (!result.success) {
      return m.reply(`❌ *Uhakiki Umeshindikana!*\n\n${result.error}`)
    }

    const response = result.data || {}
    const userInfo = response?.data?.user || response?.user || response?.data || {}
    const uid = userInfo?.localId || response?.data?.localId || response?.localId || '-'
    const emailStatus = userInfo?.emailVerified === true ? 'Terverifikasi (Verified)' : 'Belum Terverifikasi'

    let createdDate = '-'
    if (userInfo?.createdAt && !isNaN(Number(userInfo.createdAt))) {
      createdDate = new Date(Number(userInfo.createdAt)).toLocaleDateString('sw-TZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    let lastLogin = '-'
    if (userInfo?.lastLoginAt && !isNaN(Number(userInfo.lastLoginAt))) {
      lastLogin = new Date(Number(userInfo.lastLoginAt)).toLocaleDateString('sw-TZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    let textResult = `🎉 *AKAUNTI YA ALIGHT MOTION IMEHUBIRIWA!*\n\n`
    textResult += `📧 *Email:* ${email}\n`
    textResult += `🆔 *UID:* ${uid}\n`
    textResult += `✉️ *Status ya Email:* ${emailStatus}\n`
    textResult += `📅 *Iliundwa:* ${createdDate}\n`
    textResult += `🕐 *Login ya Mwisho:* ${lastLogin}\n\n`
    textResult += `✅ *Uhakiki umekamilika kikamilifu!*`

    return m.reply(textResult)

  } catch (e) {
    return m.reply(`❌ *Kosa wakati wa ku-verify:* ${e.message}`)
  }
}

// CONFIGURATION YA COMMAND
handler.help = ['amprem <email>', 'amprem <email>|<link>']
handler.tags = ['tools']
handler.command = ['amprem', 'amv2', 'ampremium']
handler.premium = true // Inafanya kazi kwa watumiaji wa Premium pekee

export default handler
