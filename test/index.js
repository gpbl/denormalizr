/* eslint-env mocha */

import { expect } from "chai";

import { denormalize } from "../src";
import { normalize, Schema, arrayOf } from 'normalizr';

const articleSchema = new Schema('articles');
const userSchema = new Schema('users');
const collectionSchema = new Schema('collections');

articleSchema.define({
  author: userSchema,
  collections: arrayOf(collectionSchema)
});

collectionSchema.define({
  curator: userSchema
});

const response = {
  articles: [{
    id: 1,
    title: 'Some Article',
    author: {
      id: 1,
      name: 'Dan'
    },
    collections: [{
      id: 1,
      name: 'Dan'
    }, {
      id: 2,
      name: 'Giampaolo'
    }]
  }, {
    id: 2,
    title: 'Other Article',
    author: {
      id: 1,
      name: 'Dan'
    }
  }]
};

const data = normalize(response, {
  articles: arrayOf(articleSchema)
});

describe("denormalize", () => {

  it("shoud return the original entity", () => {
    const article = data.entities.articles["1"];
    expect(denormalize(article, data.entities, articleSchema)).to.be.eql(response.articles[0]);
  });

});
