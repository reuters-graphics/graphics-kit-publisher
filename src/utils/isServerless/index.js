export default () => {
  if (
    process.env.GRAPHICS_SERVER_USERNAME &&
    process.env.GRAPHICS_SERVER_PASSWORD &&
    process.env.GRAPHICS_SERVER_API_KEY
  ) return true;
  return false;
};
