import config from '../config/index';

/** OSS 上的素材目录，内容由 scripts/process_assets.py 产出的 design/dist/images 上传 */
const ASSET_PREFIX = 'baby/images';

export const asset = (path: string) => `${config.ossBaseUrl}/${ASSET_PREFIX}/${path}`;

export const IMAGES = {
  fox: asset('characters/fox.png'),
  dino: asset('characters/dino.png'),
  bunny: asset('characters/bunny.png'),
  robot: asset('characters/robot.png'),
  bear: asset('characters/bear.png'),
  penguin: asset('characters/penguin.png'),

  devicePhone: asset('illus/device_phone.png'),
  foxPhone: asset('illus/fox_phone.png'),
  success: asset('illus/success.png'),
  offline: asset('illus/offline.png'),

  bannerCall: asset('scenes/banner_call.jpg'),
  bannerSpace: asset('scenes/banner_space.jpg'),
  bannerStory: asset('scenes/banner_story.jpg'),
  callNight: asset('scenes/call_night.jpg'),
  worldForest: asset('scenes/world_forest.jpg'),
  login: asset('scenes/login.jpg'),
  friends: asset('scenes/friends.jpg'),
} as const;
