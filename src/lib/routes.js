const rawBase = import.meta.env.BASE_URL || '/';
export const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

const withBase = (path = '') => `${baseUrl}${String(path).replace(/^\/+/, '')}`;

export const routes = {
  home: baseUrl,
  condos: withBase('condos/'),
  rules: withBase('rules-and-regulations/'),
  attractions: withBase('local-attractions/'),
  areaServices: withBase('local-resources/'),
  communityResources: withBase('barrier-dunes-resources/'),
  admin: withBase('admin/'),
  adminLogin: withBase('admin/login/'),
};

export const assetUrl = (path) => withBase(path);
