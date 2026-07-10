const rawBase = import.meta.env.BASE_URL || '/';
export const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export const routes = {
  home: baseUrl,
  admin: `${baseUrl}admin/`,
  adminLogin: `${baseUrl}admin/login/`,
};
