export const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/common/`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
  },
};
