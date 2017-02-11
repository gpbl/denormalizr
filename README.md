<p align="center">
    <img style="margin: 0 auto" src="https://cloud.githubusercontent.com/assets/120693/19218826/36eb41c2-8e04-11e6-98a5-2fdad6ca45fe.png" width="359">
</p>

**denormalizr** takes data and entities normalized by [normalizr](https://github.com/gaearon/normalizr), and returns its complete tree – including nested entities.

This module is useful when consuming normalized data, e.g. in redux [selectors](http://redux.js.org/docs/recipes/ComputingDerivedData.html). While normalizr is great on making data consistent between the app, reassembling entities can be a tedious work. Denormalizr can help!


[![npm version](https://img.shields.io/npm/v/denormalizr.svg?style=flat-square)](https://www.npmjs.com/package/denormalizr)
[![npm downloads](https://img.shields.io/npm/dm/denormalizr.svg?style=flat-square)](https://www.npmjs.com/package/denormalizr)
[![build status](https://img.shields.io/travis/gpbl/denormalizr/master.svg?style=flat-square)](https://travis-ci.org/gpbl/denormalizr) 
[![Code Climate](https://img.shields.io/codeclimate/github/gpbl/denormalizr.svg?style=flat-square)](https://codeclimate.com/github/gpbl/denormalizr) 
[![Coveralls](https://img.shields.io/coveralls/gpbl/denormalizr.svg?style=flat-square)](https://coveralls.io/github/gpbl/denormalizr)

```
npm install denormalizr --save
```

```js
import { denormalize } from "denormalizr";
const denormalized = denormalize(entity, entities, entitySchema);
```

### Documentation 

* [API](#api)
* [Examples](#examples)
  * [Denormalize a single object](#denormalize-a-single-object)
  * [Denormalize a list of objects](#denormalize-a-list-of-objects)
  * [Denormalize by passing the id](#denormalize-by-passing-the-id)
  * [Denormalize by passing a list of ids](#denormalize-by-passing-a-list-of-ids)
  * [Recursive schemas](#recursive-schemas)
* [Usage with Immutable](#usage-with-immutable)
* [Changelog](CHANGELOG.md)

## API

```
denormalize (entity, entities, schema) -> Object|Array|Immutable.Map|Immutable.List
```

### Params 

**entity** `{Object|Array|Number|String|Immutable.Map|Immutable.List}` 

> The entity to denormalize, its id, or an array of entities or ids.

**entities** `{Object|Immutable.Map}` 

> An object to entities used to denormalize entity and its referred entities.

**entitySchema** `{schema.Entity}`

> The normalizr schema used to define `entity`.

### Returns

The denormalized object (or Immutable.Map), or an array of denormalized objects (or an Immutable.List).

## Examples

For the following examples, consider to have a JSON response from a REST API consisting in a list of articles,
where each article has a `author` field.

```json
{
  "articles": [{
    "id": 1,
    "title": "10 mindblowing reasons to prefer composition over inheritance",
    "author": {
      "id": 1,
      "name": "Dan"
    },
  }, {
    "id": 2,
    "title": "You won't believe what this high order component is doing",
    "author": {
      "id": 1,
      "name": "Dan"
    }
  }]
}
```

To normalize this response with normalizr, we can define two Schemas: `articleSchema` and `authorSchema`.

```js
import { normalize, schema } from 'normalizr';

const articleSchema = new schema.Entity('articles');
const authorSchema = new schema.Entity('authors');
const articleList = new schema.Array(articleSchema);

articleSchema.define({
  author: authorSchema,
});

const normalized = normalize(response, {
  articles: articleList,
})
```

This way we have the usual normalized object with entities:

```js
// content of normalized
{ entities: 
   { articles: 
      { '1': 
         { id: 1,
           title: '10 mindblowing reasons to prefer composition over inheritance',
           author: 1 },
        '2': 
         { id: 2,
           title: 'You won\'t believe what this high order component is doing',
           author: 1 } },
     authors: 
      { '1': 
         { id: 1, 
          name: 'Dan' } } },
  result: { articles: [ 1, 2 ] } }
```

Let say we want to display the articles with ids `1` and `2`, and for each article its author. 

In order to get the whole author object for each article, we need to loop over the author entities: 

```js
const articleIds = [1, 2];
const articles = articleIds.map(id => {
  const article = normalized.entities.articles[id];
  article.author = normalized.entities.authors[article.author];
})
```

We are basically reverting to the original JSON response. We are, indeed, *denormalizing*. 

Without the need to know the entity's shapes, we can use denormalizr to simplify this process. Thus:

```js
import { denormalize } from 'denormalizr';

const articles = denormalize([1,2], normalized.entities, articleList);
```

`articles` contains now the selected articles with the authors in them:

```js
// console.log(articles)
[ { id: 1,
    title: '10 mindblowing reasons to prefer composition over inheritance',
    author: { id: 1, name: 'Dan' } },
  { id: 2,
    title: 'You won\'t believe what this high order component is doing',
    author: { id: 1, name: 'Dan' } } ]
```

`denormalize()` accepts as first parameter the **entity** we want to denormalize, which can be a 
single object, an array of object, a single id or an array of ids.
The second parameter is the whole **entities** object, which is consumed when the **entity schema** (third
parameter) has references to one or more entities.

### Denormalize a single object

```js
const article = normalized.entities.articles['1'];
const denormalized = denormalize(article, normalized.entities, articleSchema);
```
```js
// console.log(denormalized)
{
  id: 1,
  title: 'Some Article',
  author: {
    id: 1,
    name: 'Dan'
  },
}
```
### Denormalize a list of objects

```js
const article1 = normalized.entities.articles['1'];
const article2 = normalized.entities.articles['2'];

const denormalized = denormalize([article1, article2], normalized.entities, articleListSchema);
```

```js
// console.log(denormalized)
[{
  id: 1,
  title: '10 mindblowing reasons to prefer composition over inheritance',
  author: {
    id: 1,
    name: 'Dan'
  },
},{
  id: 2,
  title: 'You won\'t believe what this high order component is doing',
  author: {
    id: 1,
    name: 'Dan'
  },
}]
```

### Denormalize by passing the id

```js
const denormalized = denormalize(1, normalized.entities, articleSchema);
```

```js
// console.log(denormalized);
{
  id: 1,
  title: '10 mindblowing reasons to prefer composition over inheritance',
  author: {
    id: 1,
    name: 'Dan'
  },
}
```

### Denormalize by passing a list of ids

```js
const denormalized = denormalize([1, 2], normalized.entities, articleListSchema);
```

```js
// console.log(denormalized)
[{
  id: 1,
  title: '10 mindblowing reasons to prefer composition over inheritance',
  author: {
    id: 1,
    name: 'Dan'
  },
},{
  id: 2,
  title: 'You won\'t believe what this high order component is doing',
  author: {
    id: 1,
    name: 'Dan'
  },
}]
```

### Recursive schemas

Denormalizr can handle circular references caused by recursive schemas (see [#2](https://github.com/gpbl/denormalizr/pull/2)). 

For example, take these schemas, where articles have an author property containing a list of articles: 

```js
const articleSchema = new schema.Entity('articles');
const authorSchema = new schema.Entity('author');
const articleList = new schema.Array(articleSchema);

articleSchema.define({
  author: authorSchema,
});

authorSchema.define({
  articles: articleList,
});

const JSONResponse = {
  "articles": [{
    "id": 2,
    "title": "You won\'t believe what this high order component is doing",
    "author": {
      "id": 1,
      "name": 'Dan',
      "articles": [2],
    },
  }],
};

const normalized = normalize(JSONResponse, {
  articles: articleList,
});

const article = data.entities.articles['2'];
const denormalized = denormalize(article, data.entities, articleSchema);

console.log(denormalized.author.articles[0] === denormalized)); // true

```

## Usage with Immutable

Denormalizr works well with [immutable-js](https://facebook.github.io/immutable-js/), however recursive schemas are [not supported](https://github.com/facebook/immutable-js/issues/259):

```js
// This nested article contains only a reference to the author's id:
denormalized.author.articles[0].author === 1
```

Related work:

* [denormalizr-immutable](https://github.com/dehbmarques/denormalizr-immutable).
