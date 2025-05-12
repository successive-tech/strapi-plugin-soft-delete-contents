import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

// import { HomePage } from './HomePage';
// console
// import { PLUGIN_ID } from '../../pluginId';
import Explorer from './Explorer';
import { DesignSystemProvider  } from '@strapi/design-system';
import permissions from "../permissions"

const App = () => {
  return (
    <DesignSystemProvider>
      <Page.Protect permissions={permissions.main}>
        <Routes>
          <Route path={`/:kind?/:uid?`} element={<Explorer/>} />
          <Route path="*" element={<Page.Error />} />
        </Routes>
      </Page.Protect>
      
    </DesignSystemProvider>
  );
};

export { App };
