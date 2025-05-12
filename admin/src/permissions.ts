import { PLUGIN_ID } from "./pluginId";

const permissions = {
  main: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  settings: [{ action: `plugin::${PLUGIN_ID}.settings`, subject: null }],
};
export default permissions;