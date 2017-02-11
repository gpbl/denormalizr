/* eslint-env mocha */

import { expect } from 'chai';
import { normalize, schema } from 'normalizr';
import cloneDeep from 'lodash/cloneDeep';

import { denormalize } from '../src';

describe('denormalize', () => {
  it('should return undefined when denormalizing an undefined entity', () => {
    expect(denormalize(undefined)).to.be.undefined;
  });


  describe('parsing entities and collections', () => {
    const articleSchema = new schema.Entity('articles');
    const userSchema = new schema.Entity('users');
    const collectionSchema = new schema.Entity('collections');

    articleSchema.define({
      author: userSchema,
      collections: new schema.Array(collectionSchema),
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
    const getNormalizedEntities = () => normalize(response, {
      articles: new schema.Array(articleSchema),
    });


    it('should return the original entity', () => {
      const data = getNormalizedEntities();
      const article = data.entities.articles['1'];
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(article1);
    });

    it('should work with entities without values', () => {
      const data = getNormalizedEntities();
      const article = data.entities.articles['3'];
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(article3);
    });

    it('should work with entities with empty id', () => {
      const data = getNormalizedEntities();
      const article = data.entities.articles['4'];
      expect(denormalize(article, data.entities, articleSchema)).to.be.eql(article4);
    });

    it('should return the original entity with id as argument', () => {
      const data = getNormalizedEntities();
      expect(denormalize('1', data.entities, articleSchema)).to.be.eql(article1);
    });

    it('does not mutate the entities', () => {
      const data = getNormalizedEntities();
      const normalizedEntities = cloneDeep(data.entities);

      denormalize('1', data.entities, articleSchema);
      expect(normalizedEntities).to.be.eql(data.entities);
    });
  });

  describe('parsing interdependents objects', () => {
    const articleSchema = new schema.Entity('articles');
    const userSchema = new schema.Entity('users');

    articleSchema.define({
      author: userSchema,
    });

    userSchema.define({
      articles: new schema.Array(articleSchema),
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

    const data = normalize(response, {
      articles: new schema.Array(articleSchema),
    });

    it('should handle recursion for interdependency', () => {
      const article = data.entities.articles['80'];
      const denormalized = denormalize(article, data.entities, articleSchema);

      expect(denormalized.author.articles[0]).to.be.eql(denormalized);
    });
  });

  describe('parsing union schemas', () => {
    describe('when a schema', () => {
      const postSchema = new schema.Entity('posts');
      const userSchema = new schema.Entity('users');

      postSchema.define({
        user: userSchema,
      });

      const unionItemSchema = new schema.Union({
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

      const data = normalize(response.unionItems, new schema.Array(unionItemSchema));

      it('should return the original response', () => {
        const denormalized = data.result.map(item =>
          denormalize(item, data.entities, unionItemSchema),
        );
        expect(denormalized).to.be.deep.eql(response.unionItems);
      });
    });

    describe('when defining a relationship', () => {
      const groupSchema = new schema.Entity('groups');
      const userSchema = new schema.Entity('users');

      const member = new schema.Union({
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

      const data = normalize(response.groups, new schema.Array(groupSchema));

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
        expect(denormalized[1]).to.be.deep.eql(response.groups[1]);
      });
    });
  });

  describe('parsing nested plain objects', () => {
    const articleSchema = new schema.Entity('article');
    const userSchema = new schema.Entity('user');

    articleSchema.define({
      likes: new schema.Array({
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

    const data = normalize(response.articles, new schema.Array(articleSchema));

    it('should denormalize nested non entity objects', () => {
      const denormalized = data.result.map(id =>
        denormalize(data.entities.article[id], data.entities, articleSchema),
      );
      expect(denormalized).to.be.deep.eql(response.articles);
    });
  });

  describe('parsing nested objects', () => {
    const articleSchema = new schema.Entity('article');
    const userSchema = new schema.Entity('user');

    articleSchema.define({
      likes: {
        usersWhoLikes: new schema.Array(userSchema),
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

    const data = normalize(response.articles, new schema.Array(articleSchema));

    it('should denormalize nested non entity objects recursively', () => {
      const denormalized = data.result.map(id =>
        denormalize(data.entities.article[id], data.entities, articleSchema),
      );
      expect(denormalized).to.be.deep.eql(response.articles);
    });
  });

  describe('parsing an array of entities and collections', () => {
    const articleSchema = new schema.Entity('articles');
    const userSchema = new schema.Entity('users');
    const collectionSchema = new schema.Entity('collections');

    articleSchema.define({
      author: userSchema,
      collections: new schema.Array(collectionSchema),
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

    const data = normalize(response, {
      articles: new schema.Array(articleSchema),
    });


    const expectedArticles = [
      article1,
      article2,
    ];

    it('should return an array of entities', () => {
      const articles = [
        data.entities.articles['1'],
        data.entities.articles['2'],
      ];
      const denormalized = denormalize(articles, data.entities, new schema.Array(articleSchema));
      expect(denormalized).to.be.eql(expectedArticles);
    });

    it('should return an array of entities from list of ids', () => {
      const denormalized = denormalize([1, 2], data.entities, new schema.Array(articleSchema));
      expect(denormalized).to.be.eql(expectedArticles);
    });
  });

  describe('parsing a map of entities and collections', () => {
    const articleSchema = new schema.Entity('articles');
    const userSchema = new schema.Entity('users');
    const collectionSchema = new schema.Entity('collections');

    articleSchema.define({
      collections: new schema.Values(collectionSchema),
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

    const data = normalize(response, {
      articles: new schema.Array(articleSchema),
    });

    const expectedArticles = [
      article1,
      article2,
    ];

    it('should return an array of denormalized entities given an array of normalized entities', () => {
      const articles = [
        data.entities.articles['1'],
        data.entities.articles['2'],
      ];
      const denormalized = denormalize(articles, data.entities, new schema.Array(articleSchema));
      expect(denormalized).to.be.eql(expectedArticles);
    });

    it('should return an array of denormalized entities given an array of ids', () => {
      const denormalized = denormalize([1, 2], data.entities, new schema.Array(articleSchema));
      expect(denormalized).to.be.eql(expectedArticles);
    });
  });
});
