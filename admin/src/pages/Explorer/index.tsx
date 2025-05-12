/*
 *
 * Explorer
 *
 */

  
  import React, { useState, useEffect } from 'react';
  import { useNavigate, useParams, NavLink } from 'react-router-dom';
  import { useIntl } from 'react-intl';
  
  import { useFetchClient, useAuth } from '@strapi/strapi/admin';
  import {
    Box,
    SubNav,
    SubNavHeader,
    SubNavSection,
    SubNavSections,
    SubNavLink,
    Loader,
    Flex,
    Typography,
  } from '@strapi/design-system';

  import { Layouts, Page } from '@strapi/admin/strapi-admin';
  
  import getTrad from '../../utils/getTrad';
  import { supportsContentType } from "../../../../utils/plugin";
  import { PLUGIN_ID } from "../../pluginId";
  
  import ContentTypeEntries from './ContentTypeEntries';
  
  const Explorer: React.FunctionComponent = () => {
    const params: any = useParams();
  
    const { formatMessage } = useIntl();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const { get } = useFetchClient();
    //const { allPermissions }: { allPermissions: any[] } = useRBACProvider();
    const allPermissions = useAuth('MY_PLUGIN_ID', (state: any) => state.permissions);
  
    const [contentTypeNavLinks, setContentTypeNavLinks] = useState<any[]>([]);
  
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadingError, setLoadingError] = useState<Error | undefined>(undefined);
  
    const [activeContentType, setActiveContentType] = useState<any | undefined>(undefined);
  
    useEffect(() => {
      setIsLoading(true);
      setLoadingError(undefined);
      get('/content-manager/init')
        .then((response: any) => {

          const collectionTypeNavLinks = (response.data.data.contentTypes as any[])
            // Filter out hidden content types and content types that don't match the uid matcher
            .filter(contentType =>
              contentType.isDisplayed &&
              contentType.kind === 'collectionType' &&
              supportsContentType(contentType.uid)
            )
            // Filter out content types that the user doesn't have the permission to access
            .filter(contentType =>
              allPermissions.some((permission: any) =>
                permission.action === `plugin::${PLUGIN_ID}.explorer.read` &&
                permission.subject === contentType.uid
              )
            )
            .map(contentType => ({
              uid: contentType.uid,
              kind: contentType.kind,
              label: contentType.info.displayName,
              to: `/plugins/${PLUGIN_ID}/collectionType/${contentType.uid}`,
            }));
  
          const singleTypeNavLinks = (response.data.data.contentTypes as any[])
            // Filter out hidden content types and content types that don't match the uid matcher
            .filter(contentType =>
              contentType.isDisplayed &&
              contentType.kind === 'singleType' &&
              supportsContentType(contentType.uid)
            )
            // Filter out content types that the user doesn't have the permission to access
            .filter(contentType =>
              allPermissions.some((permission: any) =>
                permission.action === `plugin::${PLUGIN_ID}.explorer.read` &&
                permission.subject === contentType.uid
              )
            )
            .map(contentType => ({
              uid: contentType.uid,
              kind: contentType.kind,
              label: contentType.info.displayName,
              to: `/plugins/${PLUGIN_ID}/singleType/${contentType.uid}`,
            }));
  
          setContentTypeNavLinks(collectionTypeNavLinks.concat(singleTypeNavLinks));
        })
        .catch((error: Error) => {
          setLoadingError(error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, []);
  
    useEffect(() => {
      const firstContentTypeNavLink = contentTypeNavLinks[0];
      if (firstContentTypeNavLink && (!params.kind || !params.uid)) {
        navigate(`/plugins/${PLUGIN_ID}/${firstContentTypeNavLink.kind}/${firstContentTypeNavLink.uid}`);
      }
      else if (params.kind && params.uid) {
        setActiveContentType(
          contentTypeNavLinks.filter(contentType =>
            params.kind === contentType.kind &&
            params.uid === contentType.uid
          )[0]
        );
      }
    },[contentTypeNavLinks, params.kind, params.uid]);

    return (
        <Box background="neutral100">
        <Layouts.Root>
        <Page.Title>Soft Delete</Page.Title>
  
        <div>
          <Flex alignItems="stretch" gap="4">
            {/* Sidebar */}
            <Box background="neutral100" hasRadius padding={4} style={{ width: '300px' }}>
            <SubNav aria-label="Soft Delete sub nav">
               <SubNavHeader
                label={formatMessage({id: getTrad('name'), defaultMessage: 'Soft Delete'})}
                searchable
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                searchLabel={formatMessage({id: getTrad('explorer.searchContentTypes'), defaultMessage: 'Search Content Types'})}
                searchPlaceholder={formatMessage({id: getTrad('explorer.searchContentTypes'), defaultMessage: 'Search Content Types'})}
              />
              <SubNavSections>
                <SubNavSection
                  label={formatMessage({id: getTrad('explorer.collectionTypes'), defaultMessage: 'Collection Types'})}
                  collapsable
                  badgeLabel={contentTypeNavLinks
                    .filter(
                      (contentTypeNavLink) =>
                        contentTypeNavLink.kind === "collectionType"
                    )
                    .length.toString()}
                >
                  {contentTypeNavLinks
                    .filter(
                      (contentTypeNavLink) =>
                        contentTypeNavLink.kind === "collectionType" &&
                        (search ? contentTypeNavLink.label.toLowerCase().includes(search.toLowerCase()) : true)
                    )
                    .map((contentType, index) => (
                      <SubNavLink
                        tag={NavLink}
                        to={`${contentType.to}`}
                        key={index}
                        end
                      >
                        {contentType.label}
                      </SubNavLink>
                    ))}
                </SubNavSection>
                <SubNavSection
                  label={formatMessage({id: getTrad('explorer.singleTypes'), defaultMessage: 'Single Types'})}
                  collapsable
                  badgeLabel={contentTypeNavLinks
                    .filter(
                      (contentTypeNavLink) =>
                        contentTypeNavLink.kind === "singleType"
                    )
                    .length.toString()}
                >
                  {contentTypeNavLinks
                    .filter(
                      (contentTypeNavLink) =>
                        contentTypeNavLink.kind === "singleType" &&
                        (search ? contentTypeNavLink.label.toLowerCase().includes(search.toLowerCase()) : true)
                    )
                    .map((contentType, index) => (
                      <SubNavLink
                        tag={NavLink}
                        to={`${contentType.to}`}
                        key={index}
                        end
                      >
                        {contentType.label}
                      </SubNavLink>
                    ))}
                </SubNavSection>
              </SubNavSections>
            </SubNav>
            </Box>
  
            {/* Main Content */}
            <div style={{ width: "-webkit-fill-available" }}>
              {isLoading && (
                <Flex direction="column" gap="2" justifyContent="center" alignItems="center" height="100%">
                  <Loader />
                </Flex>
              )}
  
              {!isLoading && loadingError && (
                <Flex direction="column" gap="2" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="delta" textColor="neutral500">
                    {formatMessage({id: getTrad('explorer.errorLoadingContentTypes'), defaultMessage: 'Error loading types'})}
                  </Typography>
                  <Typography variant="delta" textColor="neutral600">
                    {loadingError.message}
                  </Typography>
                </Flex>
              )}
  
              {!isLoading && !loadingError && activeContentType && (
                <ContentTypeEntries contentType={activeContentType} />
              )}
            </div>
          </Flex>
        </div>
      </Layouts.Root>
      </Box>
    );
  };
  
  export default Explorer;
  