// Broadcast profile changes (name, avatar) so long-lived UI like the sidebar
// can refresh without a full page reload.

export const USER_UPDATED_EVENT = "outlr:user-updated";

export interface PublicUser {
  name: string;
  email: string;
  avatar: string;
}

export function emitUserUpdated(user: PublicUser) {
  window.dispatchEvent(new CustomEvent<PublicUser>(USER_UPDATED_EVENT, { detail: user }));
}
