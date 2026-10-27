const axios = require('axios');

async function sendTelegramAlert(job) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const text = `🎯 *New JobRadar Alert!*\n\n` +
    `💼 *${job.title}*\n` +
    `🏢 *Company:* ${job.company}\n` +
    `📍 *Location:* ${job.location || 'Remote'}\n` +
    `🎓 *Level:* ${job.experienceLevel || 'Entry / Internship'}\n` +
    `🔥 *Match Score:* ${job.matchScore || 'N/A'}%\n\n` +
    `🔗 [Apply Directly](${job.url})`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    }, { timeout: 8000 });
    return true;
  } catch (err) {
    console.error('[Notification] Telegram alert error:', err.message);
    return false;
  }
}

async function sendDiscordAlert(job) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const payload = {
    embeds: [{
      title: `🎯 ${job.title}`,
      url: job.url,
      color: 6494965, // brand indigo
      fields: [
        { name: 'Company', value: job.company || 'Unknown', inline: true },
        { name: 'Location', value: job.location || 'Morocco / Remote', inline: true },
        { name: 'Match Score', value: `${job.matchScore || 85}%`, inline: true },
        { name: 'Source', value: job.source || 'JobRadar', inline: true }
      ],
      footer: { text: 'JobRadar Alert System' },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await axios.post(webhookUrl, payload, { timeout: 8000 });
    return true;
  } catch (err) {
    console.error('[Notification] Discord alert error:', err.message);
    return false;
  }
}

async function broadcastJobAlert(job) {
  await Promise.allSettled([
    sendTelegramAlert(job),
    sendDiscordAlert(job)
  ]);
}

module.exports = {
  sendTelegramAlert,
  sendDiscordAlert,
  broadcastJobAlert
};
