import { PLUGIN_ID } from "../../../utils/plugin";

export default (policyContext, config, { strapi }) => {
  const { userAbility } = policyContext.state;
  return userAbility.can(`plugin::${PLUGIN_ID}.explorer.restore`, policyContext.params.uid);
};
