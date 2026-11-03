import {
  memo, useCallback, useMemo, useState,
} from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { ApiChatFolder } from '../../../api/types';

import { selectTelesrvCanLeave } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import { MEMO_EMPTY_ARRAY } from '../../../util/memo';
import renderText from '../../common/helpers/renderText';

import useLang from '../../../hooks/useLang';

import PeerPicker from '../../common/pickers/PeerPicker';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';

import styles from './ChatlistModal.module.scss';

type OwnProps = {
  folder: ApiChatFolder;
  suggestedPeerIds?: string[];
};

const ChatlistDelete = ({
  folder,
  suggestedPeerIds = MEMO_EMPTY_ARRAY,
}: OwnProps) => {
  const { closeChatlistModal, leaveChatlist } = getActions();

  const lang = useLang();

  const [selectedPeerIds, setSelectedPeerIds] = useState<string[]>([]);

  const restrictedIds = useMemo(() => {
    const global = getGlobal();
    return suggestedPeerIds.filter((id) => !selectTelesrvCanLeave(global, id));
  }, [suggestedPeerIds]);

  const selectableIds = useMemo(() => {
    return suggestedPeerIds.filter((id) => !restrictedIds.includes(id));
  }, [suggestedPeerIds, restrictedIds]);

  const badgeText = selectedPeerIds.length ? selectedPeerIds.length.toString() : undefined;

  const handleSelectionToggle = useCallback(() => {
    const areAllSelected = selectedPeerIds.length === selectableIds.length;
    setSelectedPeerIds(areAllSelected ? [] : selectableIds);
  }, [selectableIds, selectedPeerIds.length]);

  const handleButtonClick = useCallback(() => {
    closeChatlistModal();
    leaveChatlist({ folderId: folder.id, peerIds: selectedPeerIds });
  }, [folder.id, selectedPeerIds]);

  return (
    <div className={styles.content}>
      {Boolean(suggestedPeerIds?.length) && (
        <>
          <div className={styles.description}>
            {renderText(lang('FolderLinkSubtitleRemove'), ['simple_markdown', 'emoji'])}
          </div>
          <div className={buildClassName(styles.pickerWrapper, 'custom-scroll')}>
            <div className={styles.pickerHeader}>
              <div className={styles.pickerHeaderInfo}>
                {lang(
                  'FolderLinkHeaderChatsQuit',
                  { count: lang.number(selectedPeerIds.length) },
                  { pluralValue: selectedPeerIds.length },
                )}
              </div>
              <div
                className={styles.selectionToggle}
                role="button"
                tabIndex={0}
                onClick={handleSelectionToggle}
              >
                {selectedPeerIds.length === selectableIds.length
                  ? lang('DeselectAll')
                  : lang('ContextMenuItemSelectAll')}
              </div>
            </div>
            <PeerPicker
              itemIds={suggestedPeerIds}
              lockedUnselectedIds={restrictedIds}
              lockedUnselectedSubtitle={lang('TelesrvPermissionDenied')}
              onSelectedIdsChange={setSelectedPeerIds}
              selectedIds={selectedPeerIds}
              allowMultiple
              withStatus
              itemInputType="checkbox"
            />
          </div>
        </>
      )}
      <Button
        onClick={handleButtonClick}
      >
        <div className={styles.buttonText}>
          {!selectedPeerIds.length && lang('FolderLinkButtonRemove')}
          {Boolean(selectedPeerIds.length) && (
            <>
              {lang('FolderLinkButtonRemoveChats')}
              <Badge className={styles.buttonBadge} text={badgeText} isAlternateColor />
            </>
          )}
        </div>
      </Button>
    </div>
  );
};

export default memo(ChatlistDelete);
