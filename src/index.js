import ArraySchema from 'normalizr/lib/IterableSchema';
import EntitySchema from 'normalizr/lib/EntitySchema';
import UnionSchema from 'normalizr/lib/UnionSchema';
import merge from "lodash/merge";
import isPlainObject from "lodash/isPlainObject";
import { isImmutable, getIn, setIn } from './immutable_helpers'

function getItem(id, key, schema, entities, bag) {
  if(!bag.hasOwnProperty(key)) {
    bag[key] = {};
  }
  if(!bag[key].hasOwnProperty(id)) {
    bag[key][id] = denormalize(getIn(entities, [key, id]), entities, schema, bag);
  }
  return bag[key][id];
}

function denormalizeArray(items, entities, schema, bag) {
  const itemSchema = schema.getItemSchema();
  if (isPlainObject(itemSchema)) {
    return items.map(o => denormalize(o, entities, itemSchema, bag));
  }
  const itemKey = itemSchema.getKey();
  return items.map(id => getItem(id, itemKey, itemSchema, entities, bag));
}

function denormalizeUnion(entity, entities, schema, bag) {
  const itemSchema = schema.getItemSchema();
  return denormalize(
    Object.assign({}, entity, { [entity.schema]: entity.id }),
    entities,
    itemSchema,
    bag
  )[entity.schema];
}

export function denormalize(entity, entities, entitySchema, bag = {}) {
  if (typeof entity === 'undefined') {
    return entity;
  }
  let denormalized = isImmutable(entity) ? entity : merge({}, entity)
  if (entitySchema instanceof UnionSchema) {
    return denormalizeUnion(entity, entities, entitySchema, bag);
  }
  if (entitySchema instanceof EntitySchema) {
    const key = entitySchema.getKey();
    const id = getIn(denormalized, [entitySchema.getIdAttribute()]);
    bag[key] = Object.assign(bag[key] || {}, {[id]: denormalized});
  }
  Object.keys(entitySchema)
    .filter(attribute => attribute.substring(0, 1) !== "_")
    .filter(attribute => typeof getIn(entity, [attribute]) !== 'undefined')
    .forEach(attribute => {

      if (getIn(entity, [attribute]) === null) {
        denormalized = setIn(denormalized, [attribute], null);
        return;
      }

      const item = getIn(entity, [attribute]);

      if (entitySchema[attribute] instanceof ArraySchema) {
        denormalized = setIn(denormalized, [attribute], denormalizeArray(item, entities, entitySchema[attribute], bag));
      } else if (entitySchema[attribute] instanceof EntitySchema) {
        const itemSchema = entitySchema[attribute];
        const itemKey = itemSchema.getKey();
        denormalized = setIn(denormalized, [attribute], getItem(item, itemKey, itemSchema, entities, bag));
      } else {
        denormalized = setIn(denormalized, [attribute], denormalize(item, entities, entitySchema[attribute], bag));
      }

    });

  return denormalized;
}
