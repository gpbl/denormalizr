import ArraySchema from 'normalizr/lib/IterableSchema';
import EntitySchema from 'normalizr/lib/EntitySchema';
import UnionSchema from 'normalizr/lib/UnionSchema';
import merge from "lodash/merge";

function getItem(id, key, schema, entities, bag) {
  if(!bag[key]) {
    bag[key] = {};
  }

  if(!bag[key][id]) {
    bag[key][id] = denormalize(entities[key][id], entities, schema, bag);
  }

  return bag[key][id];
}

function denormalizeArray(items, entities, schema, bag) {
  const itemSchema = schema.getItemSchema();
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
  const denormalized = merge({}, entity);
  if (entitySchema instanceof UnionSchema) {
    return denormalizeUnion(entity, entities, entitySchema, bag);
  }

  if (entitySchema instanceof EntitySchema) {
    const key = entitySchema.getKey();
    const id = denormalized[entitySchema.getIdAttribute()];
    bag[key] = Object.assign(bag[key] || {}, {[id]: denormalized});
  }

  Object.keys(entitySchema)
    .filter(attribute => attribute.substring(0, 1) !== "_")
    .filter(attribute => !!entity[attribute])
    .forEach(attribute => {

      const itemId = entity[attribute];

      if (entitySchema[attribute] instanceof ArraySchema) {
        denormalized[attribute] = denormalizeArray(itemId, entities, entitySchema[attribute], bag);
      } else if (entitySchema[attribute] instanceof EntitySchema) {
        const itemSchema = entitySchema[attribute];
        const itemKey = itemSchema.getKey();
        denormalized[attribute] = getItem(itemId, itemKey, itemSchema, entities, bag);
      }

    });

  return denormalized;
}
