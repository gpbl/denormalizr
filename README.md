# denormalizr

Denormalizr takes an entity normalized by [normalizr](https://github.com/gaearon/normalizr), and returns its complete tree including all the referred entities.

This module is useful when consuming normalized data, e.g. from `mapStateToProps` in a redux `connect()`. While normalizr is great on making data consistent between the app, reassembling an entity can be a tedious work. Denormalizr can help!

[![build status](https://img.shields.io/travis/gpbl/denormalizr/master.svg?style=flat-square)](https://travis-ci.org/gpbl/denormalizr) [![Code Climate](https://img.shields.io/codeclimate/github/gpbl/denormalizr.svg?style=flat-square)](https://codeclimate.com/github/gpbl/denormalizr) [![npm downloads](https://img.shields.io/npm/dm/denormalizr.svg?style=flat-square)](https://www.npmjs.com/package/denormalizr) [![npm version](https://img.shields.io/npm/v/denormalizr.svg?style=flat-square)](https://www.npmjs.com/package/denormalizr)

> If you are using Immutable data, try [denormalizr-immutable](https://github.com/dehbmarques/denormalizr-immutable).

## Installation

```
npm install denormalizr --save
```

## Usage

```js
import { denormalizer } from "denormalizr";
const denormalized = denormalizer(entity, entities, entitySchema);
```

### Example

```js
import { denormalize } from "denormalizr";
const articleSchema = new Schema('articles');
const userSchema = new Schema('users');

articleSchema.define({
  author: userSchema
});

const response = {
  articles: [{
    id: 1,
    title: 'Some Article',
    author: {
      id: 1,
      name: 'Dan'
    },
  }, {
    id: 2,
    title: 'Other Article',
    author: {
      id: 1,
      name: 'Dan'
    }
  }]
};

const normalized = normalize(response, {
  articles: arrayOf(articleSchema)
});

const article = normalized.entities.articles[0];
console.log(article);
// {
//   id: 1,
//   title: 'Some Article',
//   author: '1'
// }

const denormalized = denormalize(article, normalized.entities, articleSchema);
console.log(denormalized);
// {
//   id: 1,
//   title: 'Some Article',
//   author: {
//     id: 1,
//     name: 'Dan'
//   },
// }

```
