export const DEFAULT_WEBHOOK_URL = "https://discord.com/api/webhooks/1536387844598403154/VjJ9CKGIw90vMiuoedk8nK9X2XSg-Fa9kLrfoxVJDaEUCK2-0uHvRXk0wLqkDoNIBVOb";

export async function sendDiscordWebhook(title, description, color = 0x00f0ff, fields = []) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    username: "PRIME Security & Logs Bot",
    avatar_url: "https://cdn-icons-png.flaticon.com/512/2092/2092663.png",
    embeds: [
      {
        title: `🛡️ PRIME | ${title}`,
        description: description,
        color: color,
        fields: fields,
        footer: {
          text: `PRIME System Log • ${new Date().toLocaleString("pt-BR")}`,
        },
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Discord Webhook Error:", err.message);
  }
}
