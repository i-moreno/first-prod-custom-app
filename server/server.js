import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth"; // https://github.com/Shopify/koa-shopify-auth
import Shopify, { ApiVersion, DataType } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import koaBody from "koa-body";
import mongoose from "mongoose";
import Store from "./schemas/store";
import RedisStore from "./redis";

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

// Connect to the database
const dbUri = process.env.MONGODB_URI;
async function main() {
  await mongoose.connect(dbUri);
}

main().catch(err => console.log("ERROR CONNECTING TO DB", err));

// Create a new instance of the custom storage class
const sessionStorage = new RedisStore();

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\/|\/$/g, ""),
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy, more information
  // at https://github.com/Shopify/shopify-node-api/blob/main/docs/issues.md#notes-on-session-handling
  SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
    sessionStorage.storeCallback.bind(sessionStorage),
    sessionStorage.loadCallback.bind(sessionStorage),
    sessionStorage.deleteCallback.bind(sessionStorage)
  )
});

// Storing the currently active shops in memory will force them to re-login when your server restarts.
// You should persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  // https://www.reddit.com/r/koajs/comments/ex3sur/what_does_koakeys_api_secret_do/
  server.keys = [Shopify.Context.API_SECRET_KEY];
  // https://github.com/Shopify/koa-shopify-auth#shopifyauth
  server.use(
    createShopifyAuth({
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;
        ACTIVE_SHOPIFY_SHOPS[shop] = scope;

        // https://github.com/Shopify/shopify-node-api/blob/main/docs/usage/webhooks.md#load-your-handlers
        const response = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "/webhooks",
          topic: "APP_UNINSTALLED",
          webhookHandler: async (topic, shop) =>
            delete ACTIVE_SHOPIFY_SHOPS[shop],
        });

        if (!response.success) {
          console.log(
            `Failed to register APP_UNINSTALLED webhook: ${response.result}`
          );
        }

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}&host=${host}`);
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true }),
    async (ctx) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear

  // New routes used for the App
  router.get("/settings", async (ctx) => {
    const session = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res);
    const shop = session.shop;

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (session === undefined || ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
      ctx.redirect(`/auth?shop=${shop}`);
      return
    }

    const currentShop = await Store.findOne({ name: shop });

    if (!currentShop) {
      const newStore = new Store({ name: shop });
      await newStore.save();
    }

    if (!currentShop.productId) {
      ctx.status = 200;
      ctx.body = {
        status: "EMPTY_SETTINGS",
        data: undefined,
      };

      return
    }

    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    const productDetails = await client.get({
      path: `products/${currentShop.productId}`,
      type: DataType.JSON,
    });

    ctx.body = {
      status: "OK_SETTINGS",
      data: productDetails.body.product,
    };

    ctx.status = 200;
  });

  router.post("/settings", async (ctx) => {
    const session = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res);
    const shop = session.shop;

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (session === undefined || ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
      ctx.redirect(`/auth?shop=${shop}`);
      return;
    }

    const productIdStruct = JSON.parse(ctx.request.body).productId.split("/");
    const productId = productIdStruct[productIdStruct.length - 1];

    // In this way, you’re saving this data in a database.
    const currentShop = await Store.findOne({ name: shop });
    currentShop.productId = productId;
    await currentShop.save();

    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    const productDetails = await client.get({
      path: `products/${productId}`,
      type: DataType.JSON
    });

    ctx.body = {
      status: "OK_SETTINGS",
      data: productDetails.body.product
    };

    ctx.status = 200;
  });

  router.get("(.*)", async (ctx) => {
    const shop = ctx.query.shop;

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      await handleRequest(ctx);
    }
  });

  server.use(router.allowedMethods());
  server.use(koaBody());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
