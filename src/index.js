import ArraySchema from 'normalizr/lib/IterableSchema';
import EntitySchema from 'normalizr/lib/EntitySchema';
import UnionSchema from 'normalizr/lib/UnionSchema';
import merge from "lodash/merge";

function denormalizeArray(items, entities, schema) {
  const itemSchema = schema.getItemSchema();
  const itemKey = itemSchema.getKey();
  return items.map(id => {
    const item = entities[itemKey][id];
    return denormalize(item, entities, itemSchema);
  });
}

function denormalizeUnion(entity, entities, schema) {
  const itemSchema = schema.getItemSchema();
  return denormalize(
    Object.assign({}, entity, { [entity.schema]: entity.id }),
    entities,
    itemSchema
  )[entity.schema];
}

export function denormalize(entity, entities, entitySchema, bag = {}) {
  const denormalized = {};
  if (entitySchema instanceof UnionSchema) {
    return denormalizeUnion(entity, entities, entitySchema);
  }
  Object.keys(entitySchema)
    .filter(attribute => attribute.substring(0, 1) !== "_")
    .filter(attribute => !!entity[attribute])
    .forEach(attribute => {

      const itemId = entity[attribute];

      if (entitySchema[attribute] instanceof ArraySchema) {
        denormalized[attribute] = denormalizeArray(itemId, entities, entitySchema[attribute]);
      } else if (entitySchema[attribute] instanceof EntitySchema) {
        const itemSchema = entitySchema[attribute];
        const itemKey = itemSchema.getKey();
        const item = entities[itemKey][itemId];
        denormalized[attribute] = denormalize(item, entities, itemSchema);
      }

    });

  return merge({}, entity, denormalized);
}
