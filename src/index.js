import { schema as Schema } from 'normalizr';
import merge from 'lodash/merge';
import isObject from 'lodash/isObject';
import { isImmutable, getIn, setIn } from './ImmutableUtils';

const EntitySchema = Schema.Entity;
const ArraySchema = Schema.Array;
const UnionSchema = Schema.Union;
const ValuesSchema = Schema.Values;

/**
 * Take either an entity or id and derive the other.
 *
 * @param   {object|Immutable.Map|number|string} entityOrId
 * @param   {object|Immutable.Map} entities
 * @param   {schema.Entity} schema
 * @returns {object}
 */
function resolveEntityOrId(entityOrId, entities, schema) {
  const key = schema.key;

  let entity = entityOrId;
  let id = entityOrId;

  if (isObject(entityOrId)) {
    const mutableEntity = isImmutable(entity) ? entity.toJS() : entity;
    id = schema.getId(mutableEntity) || getIn(entity, ['id']);
  } else {
    entity = getIn(entities, [key, id]);
  }

  return { entity, id };
}

/**
 * Denormalizes each entity in the given array.
 *
 * @param   {Array|Immutable.List} items
 * @param   {object|Immutable.Map} entities
 * @param   {schema.Entity} schema
 * @param   {object} bag
 * @returns {Array|Immutable.List}
 */
function denormalizeIterable(items, entities, schema, bag) {
  const isMappable = typeof items.map === 'function';

  const itemSchema = Array.isArray(schema) ? schema[0] : schema.schema;

  // Handle arrayOf iterables
  if (isMappable) {
    return items.map(o => denormalize(o, entities, itemSchema, bag));
  }

  // Handle valuesOf iterables
  const denormalized = {};
  Object.keys(items).forEach((key) => {
    denormalized[key] = denormalize(items[key], entities, itemSchema, bag);
  });
  return denormalized;
}

/**
 * @param   {object|Immutable.Map|number|string} entity
 * @param   {object|Immutable.Map} entities
 * @param   {schema.Entity} schema
 * @param   {object} bag
 * @returns {object|Immutable.Map}
 */
function denormalizeUnion(entity, entities, schema, bag) {
  const schemaAttribute = getIn(entity, ['schema']);
  const itemSchema = getIn(schema, ['schema', schemaAttribute]);
  if (!itemSchema) return entity;

  const mutableEntity = isImmutable(entity) ? entity.toJS() : entity;
  const id = itemSchema.getId(mutableEntity) || getIn(entity, ['id']);

  return denormalize(
    id,
    entities,
    itemSchema,
    bag,
  );
}

/**
 * Takes an object and denormalizes it.
 *
 * Note: For non-immutable objects, this will mutate the object. This is
 * necessary for handling circular dependencies. In order to not mutate the
 * original object, the caller should copy the object before passing it here.
 *
 * @param   {object|Immutable.Map} obj
 * @param   {object|Immutable.Map} entities
 * @param   {schema.Entity} schema
 * @param   {object} bag
 * @returns {object|Immutable.Map}
 */
function denormalizeObject(obj, entities, schema, bag) {
  let denormalized = obj;

  const schemaDefinition = typeof schema.inferSchema === 'function'
    ? schema.inferSchema(obj)
    : (schema.schema || schema)
  ;

  Object.keys(schemaDefinition)
    // .filter(attribute => attribute.substring(0, 1) !== '_')
    .filter(attribute => typeof getIn(obj, [attribute]) !== 'undefined')
    .forEach((attribute) => {
      const item = getIn(obj, [attribute]);
      const itemSchema = getIn(schemaDefinition, [attribute]);

      denormalized = setIn(denormalized, [attribute], denormalize(item, entities, itemSchema, bag));
    });

  return denormalized;
}

/**
 * Takes an entity, saves a reference to it in the 'bag' and then denormalizes
 * it. Saving the reference is necessary for circular dependencies.
 *
 * @param   {object|Immutable.Map|number|string} entityOrId
 * @param   {object|Immutable.Map} entities
 * @param   {schema.Entity} schema
 * @param   {object} bag
 * @returns {object|Immutable.Map}
 */
function denormalizeEntity(entityOrId, entities, schema, bag) {
  const key = schema.key;
  const { entity, id } = resolveEntityOrId(entityOrId, entities, schema);

  if (!bag.hasOwnProperty(key)) {
    bag[key] = {};
  }

  if (!bag[key].hasOwnProperty(id)) {
    // Ensure we don't mutate it non-immutable objects
    const obj = isImmutable(entity) ? entity : merge({}, entity);

    // Need to set this first so that if it is referenced within the call to
    // denormalizeObject, it will already exist.
    bag[key][id] = obj;
    bag[key][id] = denormalizeObject(obj, entities, schema, bag);
  }

  return bag[key][id];
}

/**
 * Takes an object, array, or id and returns a denormalized copy of it. For
 * an object or array, the same data type is returned. For an id, an object
 * will be returned.
 *
 * If the passed object is null or undefined or if no schema is provided, the
 * passed object will be returned.
 *
 * @param   {object|Immutable.Map|array|Immutable.list|number|string} obj
 * @param   {object|Immutable.Map} entities
 * @param   {schema.Entity} schema
 * @param   {object} bag
 * @returns {object|Immutable.Map|array|Immutable.list}
 */
export function denormalize(obj, entities, schema, bag = {}) {
  if (obj === null || typeof obj === 'undefined' || !isObject(schema)) {
    return obj;
  }

  if (schema instanceof EntitySchema) {
    return denormalizeEntity(obj, entities, schema, bag);
  } else if (
    schema instanceof ValuesSchema ||
    schema instanceof ArraySchema ||
    Array.isArray(schema)
  ) {
    return denormalizeIterable(obj, entities, schema, bag);
  } else if (schema instanceof UnionSchema) {
    return denormalizeUnion(obj, entities, schema, bag);
  }

  // Ensure we don't mutate it non-immutable objects
  const entity = isImmutable(obj) ? obj : merge({}, obj);
  return denormalizeObject(entity, entities, schema, bag);
}
