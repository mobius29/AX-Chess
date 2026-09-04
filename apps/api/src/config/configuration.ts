export default () => ({
  auth: {
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL,
    jwtSecret: process.env.JWT_SECRET,
    refreshTokenTtlDays: process.env.REFRESH_TOKEN_TTL_DAYS,
  },
});
