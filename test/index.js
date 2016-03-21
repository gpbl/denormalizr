/* eslint-env mocha */

import { expect } from "chai";

import { denormalize } from "../src";
import { normalize, Schema, arrayOf, unionOf } from 'normalizr';

describe("denormalize", () => {

  describe("entities and collections", () => {
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

    it("should return the original entity", () => {
      const article = data.entities.articles["1"];
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(response.articles[0]);
    });
  });

  describe("unions", () => {

    const postSchema = new Schema('posts');
    const userSchema = new Schema('users');

    postSchema.define({
      user: userSchema
    });

    const unionItemSchema = unionOf({
      post: postSchema,
      user: userSchema
    }, { schemaAttribute: 'type' });

    const response = {
      unionItems: [
        {
          id: 1,
          title: 'Some Post',
          user: {
            id: 1,
            name: 'Dan'
          },
          type: 'post'
        },
        {
          id: 2,
          name: 'Ashley',
          type: 'user'
        },
        {
          id: 2,
          title: 'Other Post',
          type: 'post'
        }
      ]
    };

    const data = normalize(response.unionItems, arrayOf(unionItemSchema));

    it("should return the original response", () => {
      const denormalized = data.result.map(item => denormalize(item, data.entities, unionItemSchema));
      expect(denormalized).to.be.deep.eql(response.unionItems);
    });
  });

});
