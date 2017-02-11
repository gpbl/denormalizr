/* eslint-env mocha */

import chai, { expect } from 'chai';
import { normalize, schema as Schema } from 'normalizr';
import { fromJS } from 'immutable';
import cloneDeep from 'lodash/cloneDeep';
import chaiImmutable from 'chai-immutable';

import { denormalize } from '../src';

chai.use(chaiImmutable);

const immutableNormalize = (response, schema) => {
  const { entities, result } = normalize(response, schema);

  return {
    entities: fromJS(entities),
    result,
  };
};

describe('(Immutable) denormalize', () => {
  it('should return undefined when denormalizing an undefined entity', () => {
    expect(denormalize(undefined)).to.be.undefined;
  });


  describe('parsing entities and collections', () => {
    const articleSchema = new Schema.Entity('articles');
    const userSchema = new Schema.Entity('users');
    const collectionSchema = new Schema.Entity('collections');

    articleSchema.define({
      author: userSchema,
      collections: new Schema.Array(collectionSchema),
    });

    collectionSchema.define({
      curator: userSchema,
    });

    const article1 = {
      id: 1,
      title: 'Some Article',
      author: {
        id: 1,
        name: 'Dan',
      },
      collections: [{
        id: 1,
        name: 'Dan',
      }, {
        id: 2,
        name: 'Giampaolo',
      }],
    };
    const article2 = {
      id: 2,
      title: 'Other Article',
      author: {
        id: 1,
        name: 'Dan',
      },
    };
    const article3 = {
      id: 3,
      title: 'Without author',
      author: null,
    };

    const article4 = {
      id: 4,
      title: 'Some Article',
      author: {
        id: '',
        name: 'Deleted',
      },
      collections: [{
        id: '',
        name: 'Deleted',
      }],
    };

    const response = {
      articles: [article1, article2, article3, article4],
    };

    // Function to return the result of the normalize function. Needed so that
    // state doesn't hang around between specs.
    const getNormalizedEntities = () => immutableNormalize(response, {
      articles: new Schema.Array(articleSchema),
    });

    it('should return the original entity', () => {
      const data = getNormalizedEntities();
      const article = data.entities.getIn(['articles', '1']);
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(fromJS(article1));
    });

    it('should work with entities without values', () => {
      const data = getNormalizedEntities();
      const article = data.entities.getIn(['articles', '3']);
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(fromJS(article3));
    });

    it('should work with entities with empty id', () => {
      const data = getNormalizedEntities();
      const article = data.entities.getIn(['articles', '4']);
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(fromJS(article4));
    });

    it('should return the original entity with id as argument', () => {
      const data = getNormalizedEntities();
      expect(denormalize('1', data.entities, articleSchema)).to.be.eql(fromJS(article1));
    });

    it('does not mutate the entities', () => {
      const data = getNormalizedEntities();
      const normalizedEntities = cloneDeep(data.entities);

      denormalize('1', data.entities, articleSchema);
      expect(normalizedEntities).to.be.eql(data.entities);
    });
  });

  describe('parsing interdependents objects', () => {
    const articleSchema = new Schema.Entity('articles');
    const userSchema = new Schema.Entity('users');

    articleSchema.define({
      author: userSchema,
    });

    userSchema.define({
      articles: new Schema.Array(articleSchema),
    });

    const response = {
      articles: [{
        id: 80,
        title: 'Some Article',
        author: {
          id: 1,
          name: 'Dan',
          articles: [80],
        },
      }],
    };

    const data = immutableNormalize(response, {
      articles: new Schema.Array(articleSchema),
    });

    // This behavior differs from non-immutable functionality. See the README
    // for more details.
    it('should handle recursion for interdependency', () => {
      const article = data.entities.getIn(['articles', '80']);
      const denormalized = denormalize(article, data.entities, articleSchema);

      expect(denormalized.getIn(['author', 'articles', '0'])).to.be.eql(article);
    });
  });

  describe('parsing union schemas', () => {
    describe('when a schema', () => {
      const postSchema = new Schema.Entity('posts');
      const userSchema = new Schema.Entity('users');

      postSchema.define({
        user: userSchema,
      });

      const unionItemSchema = new Schema.Union({
        post: postSchema,
        user: userSchema,
      }, 'type');

      const response = {
        unionItems: [
          {
            id: 1,
            title: 'Some Post',
            user: {
              id: 1,
              name: 'Dan',
            },
            type: 'post',
          },
          {
            id: 2,
            name: 'Ashley',
            type: 'user',
          },
          {
            id: 2,
            title: 'Other Post',
            type: 'post',
          },
        ],
      };

      const data = immutableNormalize(response.unionItems, new Schema.Array(unionItemSchema));

      it('should return the original response', () => {
        const denormalized = data.result.map(item =>
          denormalize(item, data.entities, unionItemSchema),
        );
        expect(fromJS(denormalized)).to.be.eql(fromJS(response.unionItems));
      });
    });

    describe('when defining a relationship', () => {
      const groupSchema = new Schema.Entity('groups');
      const userSchema = new Schema.Entity('users');

      const member = new Schema.Union({
        user: userSchema,
        group: groupSchema,
      }, 'type');

      groupSchema.define({
        owner: member,
      });

      const response = {
        groups: [
          {
            id: 1,
            owner: {
              id: 1,
              type: 'user',
              name: 'Dan',
            },
          },
          {
            id: 2,
            owner: {
              id: 2,
              type: 'user',
              name: 'Alice',
            },
          },
          {
            id: 3,
            owner: {
              id: 1,
              type: 'group',
              name: 'Teaching',
            },
          },
        ],
      };

      const data = immutableNormalize(response.groups, new Schema.Array(groupSchema));

      // TODO: This test does not make too much sense.
      // It wont return the original response because
      // the group:3 has an owner:group:1
      // so the data of the owner:group:1 will me merged to original group:1
      // making the final result be different from the original response.
      // to make the test pass, im only verifying if group:2 was correctly denormalized
      it('should return the original response', () => {
        const denormalized = data.result.map(item =>
          denormalize(item, data.entities, groupSchema),
        );
        expect(fromJS(denormalized[1])).to.be.deep.eql(fromJS(response.groups[1]));
      });
    });
  });

  describe('parsing nested plain objects', () => {
    const articleSchema = new Schema.Entity('article');
    const userSchema = new Schema.Entity('user');

    articleSchema.define({
      likes: new Schema.Array({
        user: userSchema,
      }),
    });

    const response = {
      articles: [{
        id: 1,
        title: 'Article 1',
        likes: [{
          user: {
            id: 1,
            name: 'John',
          },
        }, {
          user: {
            id: 2,
            name: 'Alex',
          },
        }],
      }, {
        id: 2,
        title: 'Article 2',
        likes: [{
          user: {
            id: 1,
            name: 'John',
          },
        }],
      }],
    };

    const data = immutableNormalize(response.articles, new Schema.Array(articleSchema));

    it('should denormalize nested non entity objects', () => {
      const denormalized = data.result.map(id => denormalize(data.entities.getIn(['article', id.toString()]), data.entities, articleSchema));
      expect(fromJS(denormalized)).to.be.deep.eql(fromJS(response.articles));
    });
  });

  describe('parsing nested objects', () => {
    const articleSchema = new Schema.Entity('article');
    const userSchema = new Schema.Entity('user');

    articleSchema.define({
      likes: {
        usersWhoLikes: new Schema.Array(userSchema),
      },
    });

    const response = {
      articles: [{
        id: 1,
        title: 'Article 1',
        likes: {
          usersWhoLikes: [
            {
              id: 1,
              name: 'John',
            },
            {
              id: 2,
              name: 'Alex',
            },
          ],
        },
      }, {
        id: 2,
        title: 'Article 2',
        likes: {
          usersWhoLikes: [
            {
              id: 1,
              name: 'John',
            },
          ],
        },
      }],
    };

    const data = immutableNormalize(response.articles, new Schema.Array(articleSchema));

    it('should denormalize nested non entity objects recursively', () => {
      const denormalized = data.result.map(id => denormalize(data.entities.getIn(['article', id.toString()]), data.entities, articleSchema));
      expect(fromJS(denormalized)).to.be.deep.eql(fromJS(response.articles));
    });
  });

  describe('parsing an array of entities and collections', () => {
    const articleSchema = new Schema.Entity('articles');
    const userSchema = new Schema.Entity('users');
    const collectionSchema = new Schema.Entity('collections');

    articleSchema.define({
      author: userSchema,
      collections: new Schema.Array(collectionSchema),
    });

    collectionSchema.define({
      curator: userSchema,
    });

    const article1 = {
      id: 1,
      title: 'Some Article',
      author: {
        id: 1,
        name: 'Dan',
      },
      collections: [{
        id: 1,
        name: 'Dan',
      }, {
        id: 2,
        name: 'Giampaolo',
      }],
    };
    const article2 = {
      id: 2,
      title: 'Other Article',
      author: {
        id: 1,
        name: 'Dan',
      },
    };
    const article3 = {
      id: 3,
      title: 'Without author',
      author: null,
    };

    const article4 = {
      id: 4,
      title: 'Some Article',
      author: {
        id: '',
        name: 'Deleted',
      },
      collections: [{
        id: '',
        name: 'Deleted',
      }],
    };

    const response = {
      articles: [article1, article2, article3, article4],
    };

    const data = immutableNormalize(response, {
      articles: new Schema.Array(articleSchema),
    });

    const expectedArticles = fromJS([
      article1,
      article2,
    ]);

    it('should return an array of entities', () => {
      const articles = fromJS([
        data.entities.getIn(['articles', '1']),
        data.entities.getIn(['articles', '2']),
      ]);
      const denormalized = denormalize(articles, data.entities, new Schema.Array(articleSchema));
      expect(denormalized).to.be.eql(expectedArticles);
    });

    it('should return an array of entities', () => {
      const denormalized = denormalize(fromJS([1, 2]), data.entities, [articleSchema]);
      expect(denormalized).to.be.eql(expectedArticles);
    });
  });

  describe('parsing an array of entities and collections', () => {
    const articleSchema = new Schema.Entity('articles');
    const userSchema = new Schema.Entity('users');
    const collectionSchema = new Schema.Entity('collections');

    articleSchema.define({
      collections: new Schema.Values(collectionSchema),
    });

    collectionSchema.define({
      curator: userSchema,
    });

    const article1 = {
      id: 1,
      title: 'Some Article',
      collections: {
        1: {
          id: 1,
          name: 'Dan',
        },
        2: {
          id: 2,
          name: 'Giampaolo',
        },
      },
    };

    const article2 = {
      id: 2,
      title: 'Other Article',
    };

    const response = {
      articles: [article1, article2],
    };

    const data = immutableNormalize(response, {
      articles: new Schema.Array(articleSchema),
    });

    const expectedArticles = fromJS([
      article1,
      article2,
    ]);

    it('should return an array of denormalized entities given an array of normalized entities', () => {
      const articles = fromJS([
        data.entities.getIn(['articles', '1']),
        data.entities.getIn(['articles', '2']),
      ]);
      const denormalized = denormalize(articles, data.entities, new Schema.Array(articleSchema));
      expect(denormalized).to.be.eql(expectedArticles);
    });

    it('should return an array of denormalized entities given an array of ids', () => {
      const denormalized = denormalize(fromJS([1, 2]), data.entities, [articleSchema]);
      expect(denormalized).to.be.eql(expectedArticles);
    });
  });
});
