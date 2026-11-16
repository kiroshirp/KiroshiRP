// Borra todo lo que el sistema guarda de una cuenta de Discord (la usan el panel y la propia persona).
export async function wipeAccount(store, id) {
  for (const digest of (await store.get('account-sessions:' + id)) || [])
    await store.delete('access-session:' + digest);
  const access = await store.get('access-application:' + id);
  if (access) await store.delete('access-steam:' + access.steamId);
  for (const prefix of [
    'account-sessions:',
    'account:',
    'character-sheet:',
    'team-application:',
    'access-application:',
  ])
    await store.delete(prefix + id);
  for (const index of ['team-index', 'access-index']) {
    const ids = (await store.get(index)) || [];
    await store.put(
      index,
      ids.filter((other) => other !== id),
    );
  }
}
