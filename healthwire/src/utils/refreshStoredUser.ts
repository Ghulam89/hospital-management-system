import axios from 'axios';
import { Base_url } from './Base_url';

/**
 * After updating a user, if that user is the logged-in session, refresh
 * localStorage from `/user/me` so Sidebar mp.* permissions match the new Role.
 */
export async function refreshStoredUserIfSelf(
  updatedUserId: string | undefined | null,
): Promise<void> {
  try {
    if (!updatedUserId) return;
    const raw = localStorage.getItem('userData');
    if (!raw) return;
    const me = JSON.parse(raw);
    const myId = me?._id || me?.id;
    if (!myId || String(myId) !== String(updatedUserId)) return;

    const token = localStorage.getItem('userToken') || '';
    if (!token) return;

    const res = await axios.get(`${Base_url}/apis/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data?.data;
    if (data && typeof data === 'object') {
      localStorage.setItem('userData', JSON.stringify(data));
    }
  } catch {
    /* ignore — sidebar will refresh on next route change */
  }
}
