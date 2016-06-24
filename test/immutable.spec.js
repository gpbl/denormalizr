/* eslint-env mocha */

import chai from "chai";

import { denormalize } from "../src";
import { normalize, Schema, arrayOf, unionOf } from 'normalizr';
import { fromJS } from 'immutable';

import chaiImmutable from 'chai-immutable'
chai.use(chaiImmutable)
const expect = chai.expect

const immutableNormalize = (response, schema) => {
  const { entities, result } = normalize(response, schema)

  return {
    entities: fromJS(entities),
    result
  }
}

describe("denormalize", () => {

  it("should return undefined when denormalizing an undefined entity", () => {
    expect(denormalize(undefined)).to.be.undefined;
  });


  describe("parsing entities and collections", () => {
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

    const article1 = {
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
    };
    const article2 = {
      id: 2,
      title: 'Other Article',
      author: {
        id: 1,
        name: 'Dan'
      }
    };
    const article3 = {
      id: 3,
      title: 'Without author',
      author: null
    };

    const article4 = {
      id: 4,
      title: 'Some Article',
      author: {
        id: '',
        name: 'Deleted'
      },
      collections: [{
        id: '',
        name: 'Deleted'
      }]
    };

    const response = {
      articles: [article1, article2, article3, article4]
    };

    const data = immutableNormalize(response, {
      articles: arrayOf(articleSchema)
    });

    it("should return the original entity", () => {
      const article = data.entities.getIn(["articles", "1"]);
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(fromJS(article1));
    });

    it("should work with entities without values", () => {
      const article = data.entities.getIn(["articles", "3"]);
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(fromJS(article3));
    });

    it("should work with entities with empty id", () => {
      const article = data.entities.getIn(["articles", "4"]);
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(fromJS(article4));
    });


  });

  describe("parsing interdependents objects", () => {
    const articleSchema = new Schema('articles');
    const userSchema = new Schema('users');

    articleSchema.define({
      author: userSchema,
    });

    userSchema.define({
      articles: arrayOf(articleSchema),
    });

    const response = {
      articles: [{
        id: 80,
        title: 'Some Article',
        author: {
          id: 1,
          name: 'Dan',
          articles: [80],
        }
      }]
    };

    const data = immutableNormalize(response, {
      articles: arrayOf(articleSchema)
    });

    // This behavior differs from non-immutable functionality. See the README
    // for more details.
    it("should handle recursion for interdependency", () => {
      const article = data.entities.getIn(["articles", "80"]);
      const denormalized = denormalize(article, data.entities, articleSchema);

      expect(denormalized.getIn(['author', 'articles', '0'])).to.be.eql(article);
    });

  });

  describe("parsing union schemas", () => {

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

    const data = immutableNormalize(response.unionItems, arrayOf(unionItemSchema));

    it("should return the original response", () => {
      const denormalized = data.result.map(item => denormalize(item, data.entities, unionItemSchema));
      expect(fromJS(denormalized)).to.be.eql(fromJS(response.unionItems));
    });
  });

  describe("parsing nested plain objects", () => {

    const articleSchema = new Schema("article");
    const userSchema = new Schema("user");

    articleSchema.define({
      likes: arrayOf({
        user: userSchema
      })
    });

    const response = {
      articles: [{
        id: 1,
        title: "Article 1",
        likes: [{
          user: {
            id: 1,
            name: "John"
          }
        }, {
          user: {
            id: 2,
            name: "Alex"
          }
        }]
      }, {
        id: 2,
        title: "Article 2",
        likes: [{
          user: {
            id: 1,
            name: "John"
          }
        }]
      }]
    };

    const data = immutableNormalize(response.articles, arrayOf(articleSchema));

    it("should denormalize nested non entity objects", () => {
      const denormalized = data.result.map(id => denormalize(data.entities.getIn(['article', id.toString()]), data.entities, articleSchema));
      expect(fromJS(denormalized)).to.be.deep.eql(fromJS(response.articles));
    });

  });

  describe("parsing nested objects", () => {

    const articleSchema = new Schema("article");
    const userSchema = new Schema("user");

    articleSchema.define({
      likes: {
        usersWhoLikes: arrayOf( userSchema )
      }
    });

    const response = {
      articles: [{
        id: 1,
        title: "Article 1",
        likes: {
          usersWhoLikes: [
          {
            id: 1,
            name: "John"
          },
          {
            id: 2,
            name: "Alex"
          }
          ]
        }
      }, {
        id: 2,
        title: "Article 2",
        likes: {
          usersWhoLikes: [
          {
            id: 1,
            name: "John"
          }
          ]
        }
      }]
    };

    const data = immutableNormalize(response.articles, arrayOf(articleSchema));

    it("should denormalize nested non entity objects recursively", () => {
      const denormalized = data.result.map(id => denormalize(data.entities.getIn(['article', id.toString()]), data.entities, articleSchema));
      expect(fromJS(denormalized)).to.be.deep.eql(fromJS(response.articles));
    });

  });

});
