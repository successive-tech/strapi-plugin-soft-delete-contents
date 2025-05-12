// import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import getTrad from './utils/getTrad';
import permissions from './permissions';

type TradOptions = Record<string, string>;

const prefixPluginTranslations = (
  trad: TradOptions,
  pluginId: string
): TradOptions => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {} as TradOptions);
};

export default {
  register(app: any) {

    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: PLUGIN_ID,
      },
      Component: async () => {
        const { App } = await import('./pages/App');

        return App;
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });

    app.createSettingSection(
      { id: PLUGIN_ID, intlLabel: { id: getTrad('name'), defaultMessage: 'Soft Delete' } },
      [
        {
          intlLabel: { id: getTrad('setting.restorationBehavior'), defaultMessage: 'Restoration Behavior' },
          id: `${PLUGIN_ID}.setting.restorationBehavior`,
          to: `/settings/${PLUGIN_ID}/restoration-behavior`,
          Component: async () => {
            const component = await import(/* webpackChunkName: "[request]" */ './pages/Settings/RestorationBehaviour');

            return component;
          },
          permissions: permissions.settings,
        },
      ],
    );

  },

  async registerTrads(app: any) { // registerTranslations
    const { locales } = app;

    const importedTranslations = await Promise.all(
      locales.map((locale: string) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, PLUGIN_ID),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      }),
    );

    return Promise.resolve(importedTranslations);
  },
};

