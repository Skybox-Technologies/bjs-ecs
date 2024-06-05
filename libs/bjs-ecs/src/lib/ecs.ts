/* eslint-disable @typescript-eslint/no-explicit-any */
import mitt from 'mitt';

export type Tag = string;
export interface Comp {
  id: Tag;
  dispose?: () => void;
}
export type CompList<T> = Array<T | Tag>;

type Archetype = bigint;

const compCodes = new Map<string, Archetype>();
function getCompCode(comp: string) {
  let code = compCodes.get(comp);
  if (code === undefined) {
    code = 1n << BigInt(compCodes.size);
    compCodes.set(comp, code);
  }
  return code;
}
function getArchetype(comps: string[]): Archetype {
  return comps.reduce((acc, comp) => acc | getCompCode(comp), 0n);
}

// component properties that should NOT propagate to entity
const COMP_DESC = new Set(['id', 'dispose']);

//TODO: understand this
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type Defined<T> = T extends any
  ? Pick<T, { [K in keyof T]-?: T[K] extends undefined ? never : K }[keyof T]>
  : never;
type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
export type MergeObj<T> = Expand<UnionToIntersection<Defined<T>>>;
export type MergeComps<T> = Omit<MergeObj<T>, keyof Comp>;

export interface EntityRaw {
  id: number;
  archetype: bigint;
  comps: Map<Tag, Comp>;
  comp: (id: Tag) => Comp | undefined;
  addComp: (comp: Comp | Tag) => void;
  is: (tag: Tag | Tag[]) => boolean;
  dispose: () => void;
}
export type Entity<T = any> = EntityRaw & MergeComps<T>;

export const uid = (() => {
  let id = 0;
  return () => id++;
})();

export function make<T extends { id: string }>(
  components: CompList<T> = []
): Entity<T> {
  const ent: EntityRaw = {
    comps: new Map<Tag, Comp>(),
    id: uid(),
    archetype: getArchetype(
      components.map((c) => (typeof c === 'string' ? c : c.id))
    ),
    comp(id: Tag): Comp | undefined {
      return this.comps.get(id);
    },

    // add a comp, or tag
    addComp(comp: Comp | Tag): void {
      if (!comp) {
        return;
      }

      // tag
      if (typeof comp === 'string') {
        return this.addComp({
          id: comp,
        });
      }

      //TODO: see https://github.com/replit/kaboom/blob/master/src/kaboom.ts#L2868
      this.comps.set(comp.id, comp);

      for (const k in comp) {
        if (COMP_DESC.has(k)) {
          continue;
        }
        const prop = Object.getOwnPropertyDescriptor(comp, k);

        if (prop) {
          if (typeof prop.value === 'function') {
            (comp as any)[k] = (comp as any)[k].bind(this);
          }

          if (prop.set) {
            Object.defineProperty(comp, k, {
              set: prop.set.bind(this),
            });
          }

          if (prop.get) {
            Object.defineProperty(comp, k, {
              get: prop.get.bind(this),
            });
          }
        }
        if ((this as any)[k] === undefined) {
          // assign comp fields to entity
          Object.defineProperty(this, k, {
            get: () => (comp as any)[k],
            set: (val) => ((comp as any)[k] = val),
            configurable: true,
            enumerable: true,
          });
        } else {
          throw new Error(`Duplicate component property: "${k}"`);
        }
      }
    },
    is(tag: Tag | Tag[]): boolean {
      if (tag === '*') {
        return true;
      }
      if (Array.isArray(tag)) {
        return tag.every((t) => this.comp(t));
      } else {
        return !!this.comp(tag);
      }
    },
    dispose() {
      entityEvents.emit('remove', this);
      this.comps.forEach((comp) => {
        if (comp.dispose) {
          comp.dispose();
        }
      });
    },
  };
  for (const comp of components) {
    ent.addComp(comp as Comp | Tag);
  }

  return ent as unknown as Entity<T>;
}

// --- query  types ---
export type CompFunc = {
  id: string;
  (...args: any[]): Comp;
};
type CompReturnType<T extends CompFunc> = T extends (...args: any) => infer R
  ? R
  : any;

export type CompFuncList<T> = Array<T | Tag>;
type ReturnTypeOFUnion<T extends CompFunc> = CompReturnType<T>;
export type EntityQuery<T extends CompFunc> = EntityRaw &
  MergeComps<ReturnTypeOFUnion<T>>;

type FilterCompFuncs<T> = T extends CompFunc ? T : never;

type ExtractCompTypes<T extends Array<CompFunc | Tag>> = MergeComps<
  UnionToIntersection<ReturnType<FilterCompFuncs<T[number]>>>
>;

// --- event emitter ---
class TypedMitt<T extends EntityEvents> {
  private emitter = mitt<T>();

  on<K extends keyof T, C extends Array<CompFunc | Tag>>(
    type: K,
    comps: C,
    handler: (entity: ExtractCompTypes<C>) => void
  ): void {
    const tags = comps.map((c) =>
      typeof c === 'string' ? c : (c as CompFunc).id
    ) as Tag[];
    const queryArchetype = getArchetype(tags);
    this.emitter.on(type, (entity) => {
      if (queryArchetype === ((entity as Entity).archetype & queryArchetype))
        handler(entity as any);
    });
  }

  emit<K extends keyof T>(type: K, entity: T[K]) {
    this.emitter.emit(type, entity);
  }
}

// --- world ---
export type EntityEvents = {
  add: Entity;
  remove: Entity;
};

export class World {
  archetypes = new Map<Archetype, Entity[]>();
  entityEvents = new TypedMitt<EntityEvents>();

  clear() {
    this.archetypes.forEach((entities) => {
      entities.forEach((e) => {
        e.dispose();
      });
    });
    this.archetypes.clear();
  }
  addEntity<T extends { id: string }>(comps: CompList<T>): Entity<T> {
    const entity = make(comps);
    const archType = this.archetypes.get(entity.archetype);
    if (archType) {
      archType.push(entity);
    } else {
      this.archetypes.set(entity.archetype, [entity]);
    }
    entityEvents.emit('add', entity);
    return entity;
  }
  removeEntity(entity: Entity) {
    const archetype = this.archetypes.get(entity.archetype);
    if (archetype) {
      const index = archetype.indexOf(entity);
      if (index !== -1) {
        const removed = archetype.splice(index, 1);
        removed.forEach((e) => {
          if (e.dispose) {
            e.dispose();
          }
        });
      }
    }
  }
  queryEntities<T extends CompFunc>(comps: CompFuncList<T>): EntityQuery<T>[] {
    const tags = comps.map((c) =>
      typeof c === 'string' ? c : (c as CompFunc).id
    ) as Tag[];
    const results: EntityQuery<T>[][] = [];
    const queryArchetype = getArchetype(tags);
    for (const [archetype, entities] of this.archetypes) {
      if ((queryArchetype & archetype) === queryArchetype) {
      results.push(entities);
      }
    }
    return ([] as EntityQuery<T>[]).concat(...results);
  }
}

function createWorld(): World {
  const newWorld = new World();
  return newWorld;
}

export const defaultWorld = createWorld();
export const entityEvents = defaultWorld.entityEvents;

export const clearWorld = defaultWorld.clear.bind(defaultWorld);

/**
 * Add an entity to the world.
 * @param comps A list of components to add to the entity
 */
export const addEntity = defaultWorld.addEntity.bind(defaultWorld);
export const removeEntity = defaultWorld.removeEntity.bind(defaultWorld);

/**
 * Generic query for entities.
 * @param comps list of components or tags the entity should have
 * @returns list of entities that match the query
 */
export const queryEntities = defaultWorld.queryEntities.bind(defaultWorld);
