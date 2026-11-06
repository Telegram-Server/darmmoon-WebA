import type { ApiChat, ApiTelesrvAction } from '../../api/types';
import type { RegularLangKey } from '../../types/language';
import type { GlobalState } from '../types';

import { isUserId } from '../../util/entities/ids';
import { isChatChannel } from '../helpers';

// The server turns code login off only while password login is on, so password login is then the only phone login
export function selectIsTelesrvCodeLoginDisabled<T extends GlobalState>(global: T) {
  return Boolean(global.appConfig.isPasswordLoginAvailable && global.appConfig.isCodeLoginDisabled);
}

export function selectTelesrvAllows<T extends GlobalState>(global: T, action: ApiTelesrvAction) {
  return !global.appConfig.telesrvPermissions?.forbiddenActions.includes(action);
}

export function selectTelesrvSendErrorKey<T extends GlobalState>(
  global: T, chatId: string,
): RegularLangKey | undefined {
  if (chatId === global.currentUserId) return undefined;
  if (!selectTelesrvAllows(global, 'send')) return 'TelesrvSendRestricted';
  if (!selectIsInTelesrvSendWhitelist(global, chatId)) return 'TelesrvSendWhitelistRestricted';
  return undefined;
}

export function selectTelesrvCanSendTo<T extends GlobalState>(global: T, chatId: string) {
  return !selectTelesrvSendErrorKey(global, chatId);
}

export function selectIsInTelesrvSendWhitelist<T extends GlobalState>(global: T, chatId: string) {
  const whitelist = global.appConfig.telesrvPermissions?.sendWhitelist;
  return !isUserId(chatId)
    || chatId === global.currentUserId
    || !whitelist?.isEnabled
    || whitelist.userIds.includes(chatId);
}

// Clearing is restricted only for private chats
export function selectTelesrvCanClearHistory<T extends GlobalState>(global: T, chatId: string) {
  return !isUserId(chatId) || selectTelesrvAllows(global, 'clear_history');
}

export function selectTelesrvCanJoin<T extends GlobalState>(global: T, chat: ApiChat) {
  return selectTelesrvCanJoinByType(global, isChatChannel(chat));
}

export function selectTelesrvCanJoinByType<T extends GlobalState>(global: T, isChannel: boolean) {
  return selectTelesrvAllows(global, isChannel ? 'join_channel' : 'join_group');
}

export function selectIsTelesrvJoinRestricted<T extends GlobalState>(global: T, chatId: string) {
  const chat = global.chats.byId[chatId];
  return Boolean(chat?.isNotJoined && !selectTelesrvCanJoin(global, chat));
}

export function selectTelesrvCanLeave<T extends GlobalState>(global: T, chatId: string) {
  if (isUserId(chatId)) return true;

  const chat = global.chats.byId[chatId];
  return selectTelesrvAllows(global, chat && isChatChannel(chat) ? 'leave_channel' : 'leave_group');
}

export function selectTelesrvCanCreate<T extends GlobalState>(global: T, isChannel: boolean) {
  return selectTelesrvAllows(global, isChannel ? 'create_channel' : 'create_group');
}

// Deleting a chat clears a private chat and leaves a group or channel
export function selectTelesrvCanDeleteChat<T extends GlobalState>(global: T, chatId: string) {
  return isUserId(chatId)
    ? selectTelesrvCanClearHistory(global, chatId)
    : selectTelesrvCanLeave(global, chatId);
}
