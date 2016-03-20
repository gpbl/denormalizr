import ArraySchema from 'normalizr/lib/IterableSchema';
import EntitySchema from 'normalizr/lib/EntitySchema';
import merge from "lodash/merge";

export function denormalize(entity, entities, entitySchema) {
  const denormalized = {};
  Object.keys(entitySchema)
    .filter(attribute => attribute.substring(0, 1) !== "_")
    .filter(attribute => attribute in entity)
    .forEach(attribute => {

      const itemId = entity[attribute];

      if (entitySchema[attribute] instanceof ArraySchema) {
        const itemSchema = entitySchema[attribute].getItemSchema();
        const itemKey = itemSchema.getKey();
        denormalized[attribute] = itemId.map(id => {
          const item = entities[itemKey][id];
          return denormalize(item, entities, itemSchema);
        });
      }

      if (entitySchema[attribute] instanceof EntitySchema) {
        const itemSchema = entitySchema[attribute];
        const itemKey = itemSchema.getKey();
        const item = entities[itemKey][itemId];
        denormalized[attribute] = denormalize(item, entities, itemSchema);
      }

    });

  return merge({}, entity, denormalized);
}
