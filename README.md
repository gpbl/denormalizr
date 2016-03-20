# denormalizr

Denormalizr takes an entity normalized by [normalizr](https://github.com/gaearon/normalizr), and returns its complete tree including all the referred entities.

[![Build Status](https://travis-ci.org/gpbl/denormalizr.svg?branch=master)](https://travis-ci.org/gpbl/denormalizr)

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
import { denormalizer } from "denormalizr";
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
