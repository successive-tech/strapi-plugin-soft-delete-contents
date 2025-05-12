/*
 *
 * ContentTypeEntries
 *
 */

//import type { ContentManagerConfigurationResponse, ContentTypeNavLink, ContentTypeEntry, Permission } from './types';

import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import parseISO from 'date-fns/parseISO';

import { useFetchClient, useAuth } from '@strapi/strapi/admin';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Typography,
  VisuallyHidden,
  Flex,
  IconButton,
  Link,
  Modal,
  Button,
  Loader,
  Alert,
} from '@strapi/design-system';
import { Layouts } from '@strapi/strapi/admin'; // or '@strapi/admin'
import { Trash, ArrowLeft, ArrowClockwise } from '@strapi/icons';
import { EmptyDocuments, EmptyPermissions  } from '@strapi/icons/symbols';
import { NavLink } from 'react-router-dom';

import { PLUGIN_ID } from '../../pluginId';
import getTrad from '../../utils/getTrad';

declare type Props = {
  contentType?: any;
};

const ContentTypeEntries: React.FunctionComponent<Props> = ({contentType}) => {

  const { formatMessage, formatDate } = useIntl();

  const { get, put } = useFetchClient();
  // const { allPermissions }: { allPermissions: Permission[] } = useRBACProvider();
  const allPermissions = useAuth('MY_PLUGIN_ID', (state: any) => state.permissions);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<Error | null>(null);

  const [mainField, setMainField] = useState<string| null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntriesId, setSelectedEntriesId] = useState<number[]>([]);
  const [alert, setAlert] = useState<{variant: 'success' | 'danger', message: string} | undefined>(undefined);

  const canRestore = allPermissions.some((permission: any) =>
    permission.action === `plugin::${PLUGIN_ID}.explorer.restore` &&
    permission.subject === contentType?.uid
  );
  const canDeletePermanantly = allPermissions.some((permission: any) =>
    permission.action === `plugin::${PLUGIN_ID}.explorer.delete-permanently` &&
    permission.subject === contentType?.uid
  );
  const canReadMainField = mainField && allPermissions.some((permission: any) =>
    permission.action === 'plugin::content-manager.explorer.read' &&
    permission.subject === contentType?.uid &&
    permission.properties.fields.includes(mainField)
  );

  useEffect(() => {
    setSelectedEntriesId([]);
    setEntries([]);
    setMainField(null);

    if (!contentType) return;

    setIsLoading(true);
    get(`/content-manager/content-types/${contentType.uid}/configuration`)
      .then((response: any) => {
        setMainField(response.data.data.contentType.settings.mainField);
      })
      .catch((error: Error) => {
        setLoadingError(error);
      });

    get(`/${PLUGIN_ID}/${contentType.kind}/${contentType.uid}`)
      .then((response: { data: any[] }) => {
        setEntries(response.data);
      })
      .catch((error: Error) => {
        setLoadingError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [contentType])

  const [restoreModalEntriesId, setRestoreModalEntriesId] = useState<number[]>([]);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const confirmRestore = () => {
    if (isRestoring) return;

    setAlert(undefined);
    setIsRestoring(true);
    put(`/${PLUGIN_ID}/${contentType?.kind}/${contentType?.uid}/restore`, {
      data: {
        ids: restoreModalEntriesId,
      },
    })
      .then(() => {
        setEntries(entries.filter(entry => !restoreModalEntriesId.includes(entry.id)));
        setSelectedEntriesId([]);
        setAlert({
          variant: 'success',
          message: formatMessage({id: getTrad('explorer.restore.success'), defaultMessage: 'Entries restored successfully'}),
        });
      })
      .catch((error: Error) => {
        setAlert({
          variant: 'danger',
          message: formatMessage({id: getTrad('explorer.restore.error'), defaultMessage: 'Error restoring entries'}),
        });
      })
      .finally(() => {
        setRestoreModalEntriesId([]);
        setIsRestoring(false);
        setTimeout(() => {
          setAlert(undefined);
        }, 3000);
      });
  };

  const [deletePermanentlyModalEntriesId, setDeletePermanentlyModalEntriesId] = useState<number[]>([]);
  const [isDeletingPermanently, setIsDeletingPermanently] = useState<boolean>(false);
  const confirmDeletePermanently = () => {
    if (isDeletingPermanently) return;

    setAlert(undefined);
    setIsDeletingPermanently(true);
    put(`/${PLUGIN_ID}/${contentType?.kind}/${contentType?.uid}/delete`, {
      data: {
        ids: deletePermanentlyModalEntriesId,
      }
    })
      .then(() => {
        setEntries(entries.filter(entry => !deletePermanentlyModalEntriesId.includes(entry.id)));
        setSelectedEntriesId([]);
        setAlert({
          variant: 'success',
          message: formatMessage({id: getTrad('explorer.deletePermanently.success'), defaultMessage: 'Entries deleted permanently successfully'}),
        });
      })
      .catch((error: Error) => {
        setAlert({
          variant: 'danger',
          message: formatMessage({id: getTrad('explorer.deletePermanently.error'), defaultMessage: 'Error deleting entries permanently'}),
        });
      })
      .finally(() => {
        setDeletePermanentlyModalEntriesId([]);
        setIsDeletingPermanently(false);
        setTimeout(() => {
          setAlert(undefined);
        }, 3000);
      });
  };

  return (
    <>
      {isLoading && (
        <Flex justifyContent="center" alignItems="center" height="100%">
          <Loader />
        </Flex>
      )}
      {!isLoading && !loadingError && contentType && (
          <Layouts.Header
          navigationAction={
            <Link tag={NavLink} startIcon={<ArrowLeft />} to={`/plugins/${PLUGIN_ID}`}>
              {formatMessage({id: getTrad('back'), defaultMessage: 'Back'})}
            </Link>
          }
          title={contentType.label}
          subtitle={formatMessage({id: getTrad('explorer.countEntriesFound'), defaultMessage: `${entries.length} entries found`}, { count: entries.length })}
          as="h2"
        />
      )}
      {!isLoading && !loadingError && contentType && (
        <Layouts.Content>
          <Table
            colCount={
              mainField && mainField != "id" && canReadMainField ? 6 : 5
            }
            rowCount={entries.length + 1}
          >
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    aria-label="Select all entries"
                    disabled={
                      (!canRestore && !canDeletePermanantly) ||
                      !entries.length
                    }
                    checked={
                      entries.length &&
                      selectedEntriesId.length === entries.length
                    }
                    indeterminate={
                      entries.length &&
                      selectedEntriesId.length &&
                      selectedEntriesId.length !== entries.length
                    }
                    onCheckedChange={() =>
                      selectedEntriesId.length === entries.length
                        ? setSelectedEntriesId([])
                        : setSelectedEntriesId(
                            entries.map((entry) => entry.id)
                          )
                    }
                  />
                </Th>
                <Th>
                  <Typography variant="sigma">ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({id: getTrad('explorer.softDeletedAt'), defaultMessage: 'Soft Deleted At'})}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">{formatMessage({id: getTrad('explorer.softDeletedBy'), defaultMessage: 'Soft Deleted By'})}</Typography>
                </Th>
                {mainField && mainField != "id" && canReadMainField && (
                  <Th>
                    <Typography variant="sigma">{mainField}</Typography>
                  </Th>
                )}
                <Th>
                  {(selectedEntriesId.length && (
                    <Flex justifyContent="end" gap="1" width="100%">
                      {canRestore && (
                        <IconButton
                          onClick={() => {
                            setDeletePermanentlyModalEntriesId([]);
                            setRestoreModalEntriesId(selectedEntriesId);
                          }}
                          label={formatMessage({id: getTrad('explorer.restore'), defaultMessage: 'Restore'})}
                        >
                          <ArrowClockwise />
                        </IconButton>
                      )}
                      {canDeletePermanantly && (
                        <IconButton
                          onClick={() => {
                            setRestoreModalEntriesId([]);
                            setDeletePermanentlyModalEntriesId(
                              selectedEntriesId
                            );
                          }}
                          label={formatMessage({id: getTrad('explorer.deletePermanently'), defaultMessage: 'Delete Permanently'})}
                        >
                          <Trash />
                        </IconButton>
                      )}
                    </Flex>
                  )) || <VisuallyHidden>{formatMessage({id: getTrad('explorer.actions'), defaultMessage: 'Actions'})}</VisuallyHidden>}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {(entries.length &&
                entries.map((entry) => (
                  <Tr key={entry.id}>
                    <Td>
                      <Checkbox
                        aria-label={`Select ${entry.name}`}
                        disabled={!canRestore && !canDeletePermanantly}
                        checked={selectedEntriesId.includes(entry.id)}
                        onCheckedChange={() =>
                          selectedEntriesId.includes(entry.id)
                            ? setSelectedEntriesId(
                                selectedEntriesId.filter(
                                  (item) => item !== entry.id
                                )
                              )
                            : setSelectedEntriesId([
                                ...selectedEntriesId,
                                entry.id,
                              ])
                        }
                      />
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">
                        {entry.id}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">
                        {formatDate(parseISO(entry._softDeletedAt), {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">
                        {entry._softDeletedBy.name || entry._softDeletedBy.id || "-"}&nbsp;({entry._softDeletedBy.type})
                      </Typography>
                    </Td>
                    {mainField && mainField != "id" && canReadMainField && (
                      <Td>
                        <Typography textColor="neutral800">
                          {entry[mainField]}
                        </Typography>
                      </Td>
                    )}
                    <Td>
                      <Flex justifyContent="end" gap="1">
                        {canRestore && (
                          <IconButton
                            onClick={() => {
                              setDeletePermanentlyModalEntriesId([]);
                              setRestoreModalEntriesId([entry.id]);
                            }}
                            label={formatMessage({id: getTrad('explorer.restore'), defaultMessage: 'Restore'})}

                          >
                            <ArrowClockwise/>
                          </IconButton>
                        )}
                        {canDeletePermanantly && (
                          <IconButton
                            onClick={() => {
                              setRestoreModalEntriesId([]);
                              setDeletePermanentlyModalEntriesId([
                                entry.id,
                              ]);
                            }}
                            label={formatMessage({id: getTrad('explorer.deletePermanently'), defaultMessage: 'Delete Permanently'})}
                          >
                            <Trash></Trash>
                          </IconButton>
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                ))) || (
                <Tr>
                  <Td colSpan={5}>
                    <Flex direction="column" gap="6" padding="4rem">
                      <EmptyDocuments width="10rem" height="5.5rem" />
                      <Typography variant="delta" textColor="neutral600">
                        {formatMessage({id: getTrad('explorer.noEntriesFound'), defaultMessage: 'No entries found'})}
                      </Typography>
                    </Flex>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Layouts.Content>
      )}
      {!isLoading && loadingError && (
        <Flex
          direction="column"
          gap="2"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <Typography variant="delta" textColor="neutral500">
            {formatMessage({id: getTrad('explorer.errorLoadingEntries'), defaultMessage: 'Error loading entries'})}
          </Typography>
          <Typography variant="delta" textColor="neutral600">
            {loadingError.message}
          </Typography>
        </Flex>
      )}
      {!isLoading && !loadingError && !contentType && (
        <Flex
          direction="column"
          gap="2"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <EmptyPermissions width="10rem" height="5.5rem" />
          <Typography variant="delta" textColor="neutral600">
            {formatMessage({id: getTrad('explorer.noContentTypeSelected'), defaultMessage: 'No type selected'})}
          </Typography>
        </Flex>
      )}
      {(restoreModalEntriesId.length && (
        <Modal.Root open={restoreModalEntriesId.length > 0} onOpenChange={!isRestoring ? () => setRestoreModalEntriesId([]) : null}>
          <Modal.Content
          aria-labelledby="title"
        >
          <Modal.Header>
            <Typography
              fontWeight="bold"
              textColor="neutral800"
              as="h2"
              id="title"
            >
              {formatMessage({id: getTrad('explorer.confirmation.restore.title'), defaultMessage: 'Confirm Restoration'})}
            </Typography>
          </Modal.Header>
          <Modal.Body>
            <Typography textColor="neutral800">
              {formatMessage({id: getTrad('explorer.confirmation.restore.description'), defaultMessage: 'Are you sure you want to restore this?'})}
            </Typography>
          </Modal.Body>
          <Modal.Footer>
              <Button
                variant="tertiary"
                onClick={() => setRestoreModalEntriesId([])}
                disabled={isRestoring}
              >
                {formatMessage({id: getTrad('cancel'), defaultMessage: 'Cancel'})}
              </Button>
              <Button
                variant="default"
                onClick={confirmRestore}
                loading={isRestoring}
                startIcon={<ArrowClockwise />}
              >
                {formatMessage({id: getTrad('explorer.restore'), defaultMessage: 'Restore'})}
              </Button>
          </Modal.Footer>
        </Modal.Content>
        </Modal.Root>

      )) || <></>}
      {(deletePermanentlyModalEntriesId.length && (
        <Modal.Root open={deletePermanentlyModalEntriesId.length > 0} onOpenChange={
          !isDeletingPermanently
            ? () => setDeletePermanentlyModalEntriesId([])
            : null
        }>
          <Modal.Content
          aria-labelledby="title"
        >
          <Modal.Header>
            <Typography
              fontWeight="bold"
              textColor="neutral800"
              as="h2"
              id="title"
            >
              {formatMessage({id: getTrad('explorer.confirmation.deletePermanently.title'), defaultMessage: 'Confirm Delete Permanently'})}
            </Typography>
          </Modal.Header>
          <Modal.Body>
            <Typography textColor="neutral800">
              {formatMessage({id: getTrad('explorer.confirmation.deletePermanently.description'), defaultMessage: 'Are you sure you want to delete this permanently?'})}
            </Typography>
          </Modal.Body>
          <Modal.Footer>
          <Button
                onClick={() => setDeletePermanentlyModalEntriesId([])}
                variant="tertiary"
                disabled={isDeletingPermanently}
              >
                {formatMessage({id: getTrad('cancel'), defaultMessage: 'Cancel'})}
              </Button>
              <Button
                variant="danger-light"
                onClick={confirmDeletePermanently}
                loading={isRestoring}
                startIcon={<Trash />}
              >
                {formatMessage({id: getTrad('explorer.deletePermanently'), defaultMessage: 'Delete permanently'})}
              </Button>
          </Modal.Footer>
        </Modal.Content>
        </Modal.Root>

      )) || <></>}
      {(alert && <Alert
        position="fixed"
        top="5%"
        left="40%"
        zIndex="100"
        variant={alert.variant}
        onClose={() => setAlert(undefined)}
      >
        {alert.message}
      </Alert>) || <></>}
    </>
  );
}

export default ContentTypeEntries;
