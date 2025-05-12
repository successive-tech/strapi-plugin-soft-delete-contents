import { Core } from '@strapi/strapi';
import { supportsContentType, PLUGIN_ID } from "../../utils/plugin";
import { getSoftDeletedByAuth, eventHubEmit } from "./utils/index";

const sdWrapParams = (opts: any, uid: any) => {
    if (!supportsContentType(uid)) {
    return opts;
  }

  if(opts.data) {
    delete opts.data._softDeletedAt;
    delete opts.data._softDeletedById;
    delete opts.data._softDeletedByType;
  }

  return {
    ...opts,
    filters: opts.where ?? opts.filters,
    populate: opts.populate,
    locale: opts.locale,
    status: opts.publicationState,
    data: opts.data,
    documentId: opts.id ?? opts.documentId,
  };
}

export default async ({ strapi }: { strapi: Core.Strapi & { admin: any } }) => {
  // Setup Plugin Settings
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'plugin',
    name: PLUGIN_ID,
  });
  const pluginStoreSettings: any = await pluginStore.get({ key: 'settings' });
  if (!pluginStoreSettings || !pluginStoreSettings.singleTypesRestorationBehavior || !pluginStoreSettings.draftPublishRestorationBehavior) {
    const defaultSettings = {
      singleTypesRestorationBehavior: pluginStoreSettings?.singleTypesRestorationBehavior || 'soft-delete',
      draftPublishRestorationBehavior: pluginStoreSettings?.draftPublishRestorationBehavior || 'unchanged',
    };
    await pluginStore.set({ key: 'settings', value: defaultSettings });
  }

  // Setup Permissions
  strapi.admin.services.permission.actionProvider.get('plugin::content-manager.explorer.delete').displayName = 'Soft Delete';

  const contentTypeUids = Object.keys(strapi.contentTypes).filter(supportsContentType);

  strapi.admin.services.permission.actionProvider.register({
    uid: 'read',
    displayName: 'Read',
    pluginName: PLUGIN_ID,
    section: 'plugins',
  });

  strapi.admin.services.permission.actionProvider.register({
    uid: 'settings',
    displayName: 'Settings',
    pluginName: PLUGIN_ID,
    section: 'plugins',
  });

  strapi.admin.services.permission.actionProvider.register({
    uid: 'explorer.read',
    options: { applyToProperties: [ 'locales' ] },
    section: 'contentTypes',
    displayName: 'Deleted Read',
    pluginName: PLUGIN_ID,
    subjects: contentTypeUids,
  });

  strapi.admin.services.permission.actionProvider.register({
    uid: 'explorer.restore',
    options: { applyToProperties: [ 'locales' ] },
    section: 'contentTypes',
    displayName: 'Deleted Restore',
    pluginName: PLUGIN_ID,
    subjects: contentTypeUids,
  });

  strapi.admin.services.permission.actionProvider.register({
    uid: 'explorer.delete-permanently',
    options: { applyToProperties: [ 'locales' ] },
    section: 'contentTypes',
    displayName: 'Delete Permanently',
    pluginName: PLUGIN_ID,
    subjects: contentTypeUids,
  });


  // 'Decorate' Strapi's EventHub to prevent firing 'entry.update' events from soft-delete plugin
  const defaultEventHubEmit = strapi.eventHub.emit;
  strapi.eventHub.emit = async (event: string, ...args) => {
    const data: any = args[0];
    if (supportsContentType(data.uid) && event === 'entry.update' && data.plugin?.id !== PLUGIN_ID) {
      const entry = await strapi.query(data.uid).findOne({
        select: 'id', // Just select the id, we just need to know if it exists
        where: {
          id: data.entry.id,
          _softDeletedAt: null
        }
      });
      if (!entry) {
        return;
      }
    }
    await defaultEventHubEmit(event, ...args);
  };

  strapi.documents.use(async (context, next) => {
    const { action, params, uid } = context;

    // Skip non-supported content-types
    if (!supportsContentType(uid)) {
      return await next();
    }

    // Retrieve authenticated user info
    const reqCtx = strapi.requestContext.get();
    const { id: authId, strategy: authStrategy } = getSoftDeletedByAuth(reqCtx.state.auth);

    // Handle single delete → soft-delete
    if (action === 'delete') {
      // Prepare params similar to wrapParams
      const wrapped: any = sdWrapParams(params, uid);
      // Attach soft-delete fields
      context.params = {
        ...wrapped,
        data: {
          ...wrapped.data,
          _softDeletedAt: Date.now(),
          _softDeletedById: authId,
          _softDeletedByType: authStrategy,
        },
      };

      const result = await strapi.documents(uid).update({
        documentId: context.params.documentId,
        data: (context.params as any).data,
      });

      eventHubEmit({ uid, event: 'entry.delete', action: 'soft-delete', entity: result });
      return result;
    }

    // Handle bulk delete → soft-delete many
    if ((action as any) === 'deleteMany') {
      const wrapped = sdWrapParams(params, uid);
      const entities = await strapi.documents(uid).findMany({ ...wrapped, filters: wrapped.where });
      const deleted: any[] = [];
      for (const entity of entities) {
        // Modify each document’s params
        const docParams = {
          ...wrapped,
          data: {
            ...wrapped.data,
            _softDeletedAt: Date.now(),
            _softDeletedById: authId,
            _softDeletedByType: authStrategy,
          },
          documentId: entity.id,
        };
        context.params = docParams;
        const res = await next();
        deleted.push(res);
        eventHubEmit({ uid, event: 'entry.delete', action: 'soft-delete', entity: res });
      }
      return deleted;
    }

    if ((action === 'findOne' || action === 'findMany' || action === 'count')) {
      context.params = {
        ...params,
        filters: {
          ...(params.filters || {}),
          _softDeletedAt: { $null: true },
        },
      };
    }

    return await next();
  });

};
