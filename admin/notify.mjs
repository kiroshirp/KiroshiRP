// Aviso por mensaje directo de Discord al cambiar el estado de una candidatura. Es un extra: si falla (MD cerrados, sin token), no afecta al cambio.
const TEXT = {
  aceptada:
    '**KiroshiRP** · Tu solicitud para unirte al equipo ha sido **aceptada**. Entra en tu cuenta de la web para ver los siguientes pasos.',
  rechazada:
    '**KiroshiRP** · Tu solicitud para unirte al equipo **no ha sido aceptada** esta vez. Gracias por el interés; puedes volver a intentarlo más adelante.',
};

export async function notifyStatus({ env, fetcher = fetch }, discordId, status, text) {
  if (!TEXT[status] || !env.DISCORD_BOT_TOKEN) return false;
  const headers = {
    Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN,
    'Content-Type': 'application/json',
  };
  try {
    const opened = await fetcher('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: discordId }),
      signal: AbortSignal.timeout(4000),
    });
    if (!opened.ok) return false;
    const { id } = await opened.json();
    const sent = await fetcher(`https://discord.com/api/v10/channels/${id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: text || TEXT[status], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(4000),
    });
    return sent.ok;
  } catch {
    return false;
  }
}
