import { Client, type ClientConfig } from '@line/bot-sdk';

const config: ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN as string,
};

export const lineClient = new Client(config);


