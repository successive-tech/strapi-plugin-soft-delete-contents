export const supportsContentType = (uid?: string) => {
  return uid?.match(/^api::/) || false;// || !uid?.match(/^\w+::/) || false; // TODO: Deleting a component doesn't use the entityService
};

export const PLUGIN_ID = 'soft-delete';
