// Estado compartido del panel. Todos los módulos leen y escriben aquí.
export const state = {
  csrf: '',
  mode: 'local',
  files: [],
  drafts: [],
  current: null,
  dirty: false,
  working: false,
  extra: {},
  settingsValue: {},
  metadataRaw: false,
  settingsRaw: false,
  pending: null,
  catalogGeneration: 0,
  metadataCache: new Map(),
  disabledControls: new Map(),
};
