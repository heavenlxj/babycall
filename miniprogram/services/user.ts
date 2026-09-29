import { http } from '../core/request';
import * as db from '../mock/db';
import type { TokenInfo, UserProfile } from '../models/index';

const mockToken = (): TokenInfo => ({
  accessToken: `mock_access_${Date.now()}`,
  refreshToken: `mock_refresh_${Date.now()}`,
  expiresIn: 7200,
});

export const userService = {
  loginByCode: (code: string) =>
    http.post<TokenInfo>('/v1/auth/wechat', { code }, { auth: false, mock: mockToken }),

  loginByPhone: (code: string, phoneCode: string) =>
    http.post<TokenInfo>('/v1/auth/phone', { code, phoneCode }, { auth: false, mock: mockToken }),

  refreshToken: (refreshToken: string) =>
    http.post<TokenInfo>('/v1/auth/refresh', { refreshToken }, { auth: false, silent: true, mock: mockToken }),

  getProfile: () => http.get<UserProfile>('/v1/user/profile', undefined, { mock: () => ({ ...db.profile }) }),
};
