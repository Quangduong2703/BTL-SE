import { getExpressApp } from '../server/getApp.js';

const app = getExpressApp();

export const config = {
  runtime: 'nodejs',
};

export default app;
