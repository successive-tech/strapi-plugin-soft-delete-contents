import { sanitize } from '@strapi/utils'
import { PLUGIN_ID } from '../../../utils/plugin';

declare const strapi; // global strapi

export const getSoftDeletedByAuth = (auth: any) => {
  const id: number | null = auth.credentials?.id || null;
  const strategy: 'admin' | 'users-permissions' | 'api-token' | 'transfer-token' | string = auth.strategy.name;

  return { id, strategy };
};

export const getService = (name: string) => {
  return strapi.plugin(PLUGIN_ID).service(name);
};

declare type CustomEventHubEmit = {
  uid: string;
  entity: any;
} & ({
  event: 'entry.delete';
  action: 'soft-delete' | 'delete-permanently';
} | {
  event: 'entry.update';
  action: 'restore';
} | {
  event: 'entry.unpublish';
  action: 'restore';
});

// export const eventHubEmit = async (params: CustomEventHubEmit) => {
//   const modelDef = strapi.getModel(params.uid);

//   const sanitizedEntity = await sanitize.sanitizers.defaultSanitizeOutput(
//     modelDef,
//     params.entity
//   );
//   strapi.eventHub.emit(params.event, {
//     model: modelDef.modelName,
//     uid: params.uid,
//     plugin: {
//       id: PLUGIN_ID,
//       action: params.action
//     },
//     entry: sanitizedEntity
//   });
// };

export const eventHubEmit = async (params: CustomEventHubEmit) => {
  const modelDef = strapi.getModel(params.uid);
  const sanitizedEntity = await strapi.contentAPI.sanitize.output(
    params.entity,
    modelDef
  );
  strapi.eventHub.emit(params.event, {
    model:    modelDef.modelName,
    uid:      params.uid,
    plugin: {
      id:     PLUGIN_ID,
      action: params.action,
    },
    entry:    sanitizedEntity,
  });
};
