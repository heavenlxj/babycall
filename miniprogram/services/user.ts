import { http } from '../core/request';
import type { TokenInfo, UserProfile } from '../models/index';

interface LoginDTO {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface RefreshDTO {
  access_token: string;
  expires_in: number;
}

interface UserDTO {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
}

const toProfile = (u: UserDTO): UserProfile => ({
  userId: u.user_id,
  nickname: u.nickname || '',
  avatar: u.avatar_url || '',
  phone: u.phone || '',
});

export const userService = {
  async loginByCode(code: string): Promise<TokenInfo> {
    const res = await http.post<LoginDTO>('/users/login', { code, source: 'mini_program' }, { auth: false, silent: true });
    return { accessToken: res.access_token, refreshToken: res.refresh_token, expiresIn: res.expires_in };
  },

  /** 用 refresh token 换新的 access token，refresh token 本身不变 */
  async refreshToken(refreshToken: string): Promise<TokenInfo> {
    const res = await http.post<RefreshDTO>('/users/auth/refresh-token', undefined, {
      auth: false,
      silent: true,
      header: { Authorization: `Bearer ${refreshToken}` },
    });
    return { accessToken: res.access_token, refreshToken, expiresIn: res.expires_in };
  },

  getProfile: async () => toProfile(await http.get<UserDTO>('/users')),
};
