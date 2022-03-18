/**
 * Based on the Redis example from shopify-node-api [Last Commit: Jan 28, 2022]
 * https://github.com/Shopify/shopify-node-api/blob/main/docs/usage/customsessions.md
 * https://github.com/Shopify/shopify-node-api/blob/main/docs/issues.md#notes-on-session-handling
 */


import SessionModel from "./../models/session";
import { Shopify } from "@shopify/shopify-api";
import Cryptr from "cryptr";

const cryption = new Cryptr(process.env.ENCRYPTION_STRING);

const storeCallback = async session => {
  const result = await SessionModel.findOne({ id: session.id });

  if (result === null) {
    await SessionModel.create({
      id: session.id,
      content: cryption.encrypt(JSON.stringify(session)),
      shop: session.shop
    });
  } else {
    await SessionModel.findOneAndUpdate(
      { id: session.id },
      {
        content: cryption.encrypt(JSON.stringify(session)),
        shop: session.shop
      }
    );
  }

  return true;
}

const loadCallback = async id => {
  const sessionResult = await SessionModel.findOne({ id });

  if (sessionResult.content.length > 0) {
    return JSON.parse(cryption.decrypt(sessionResult.content));
  }

  return undefined;
}

const deleteCallback = async id => {
  await SessionModel.deleteMany({ id });
  return true;
}

const sessionStorage = new Shopify.Session.CustomSessionStorage(
  storeCallback,
  loadCallback,
  deleteCallback
);

export default sessionStorage;