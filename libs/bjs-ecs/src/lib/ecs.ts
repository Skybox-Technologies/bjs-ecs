/* eslint-disable @typescript-eslint/no-explicit-any */
import mitt from 'mitt';

export type Tag = string;
export interface Comp {
  id: Tag;
  value: any;
  dispose?: () => void;
}
export type CompList<T extends Comp> = Array<T | Tag>;

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

export interface EntityRaw {
  id: number;
  archetype: bigint;
  comps: Record<Tag, Comp | true>;
  comp: (id: Tag) => Comp | true | undefined;
  addComp: (comp: Comp | Tag) => void;
  is: (tag: Tag | Tag[]) => boolean;
  dispose: () => void;
}

export type CompsListType<T extends Array<Comp | Tag>> = {
  [K in Exclude<T[number], string>['id']]: Extract<
    T[number],
    { id: K }
  >['value'];
};
export type Entity<T extends Array<Comp | Tag>> = EntityRaw & CompsListType<T>

export function createComp<T extends (...args: any) => any, I extends string>(
  id: I,
  f: T
) {
  const proxy = (...args: Parameters<T>) => {
    const value = f(...args) as ReturnType<T>;
    return { id, value };
  };
  proxy.id = id;
  return proxy;
}

export const uid = (() => {
  let id = 0;
  return () => id++;
})();

export function make<T extends Comp>(
  components: CompList<T> = []
): Entity<CompList<T>> {
  const ent: EntityRaw = {
    comps: {},
    id: uid(),
    archetype: getArchetype(
      components.map((c) => (typeof c === 'string' ? c : c.id))
    ),
    comp(id: Tag): Comp | true | undefined {
      return this.comps[id];
    },

    // add a comp, or tag
    addComp(comp: Comp | Tag): void {
      if (!comp) {
        return;
      }

      // tag
      if (typeof comp === 'string') {
        this.comps[comp] = true;
        return;
      }

      this.comps[comp.id] = comp;
      // add comp name prop
      if ((this as any)[comp.id] === undefined) {
        Object.defineProperty(this, comp.id, {
          value: comp.value,
          configurable: true,
          enumerable: true,
        })
      } else {
        throw new Error(`Duplicate component: "${comp.id}"`);
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
      Object.values(this.comps).forEach((comp) => {
        if (typeof comp !== "boolean"  && comp.dispose) {
          comp.dispose();
        }
      });
    },
  };

  for (const comp of components) {
    ent.addComp(comp);
  }

  return ent as unknown as Entity<CompList<T>>;
}

// --- query  types ---
export type CompFunc = {
  id: string;
  (...args: any[]): Comp;
};
// export type CompFuncList<T> = Array<T | Tag>;
export type CompFuncList<T extends CompFunc | Tag> = Array<T>;


export type QueryType<T extends Array<CompFunc | Tag>> = {
  [K in ReturnType<Exclude<T[number], string>>['id']]: Extract<
    ReturnType<Exclude<T[number], string>>,
    { id: K }
  >['value'];
} & EntityRaw;

// --- event emitter ---
class TypedMitt<T extends EntityEvents> {
  private emitter = mitt<T>();

  on<K extends keyof T, C extends Array<CompFunc | Tag>>(
    type: K,
    comps: C,
    handler: (entity: QueryType<C>) => void
  ): void {
    const tags = comps.map((c) =>
      typeof c === 'string' ? c : (c as CompFunc).id
    ) as Tag[];
    const queryArchetype = getArchetype(tags);
    this.emitter.on(type, (entity) => {
      if (queryArchetype === ((entity as EntityRaw).archetype & queryArchetype))
        handler(entity as any);
    });
  }

  emit<K extends keyof T>(type: K, entity: T[K]) {
    this.emitter.emit(type, entity);
  }
}

// --- world ---
export type EntityEvents = {
  add: EntityRaw;
  remove: EntityRaw;
};

export class World {
  archetypes = new Map<Archetype, EntityRaw[]>();
  entityEvents = new TypedMitt<EntityEvents>();

  clear() {
    this.archetypes.forEach((entities) => {
      entities.forEach((e) => {
        e.dispose();
      });
    });
    this.archetypes.clear();
  }
  addEntity<T extends Comp>(comps: CompList<T>): Entity<CompList<T>> {
    const entity = make(comps);
    const archetype = this.archetypes.get(entity.archetype);
    if (archetype) {
      archetype.push(entity);
    } else {
      this.archetypes.set(entity.archetype, [entity]);
    }
    entityEvents.emit('add', entity);
    return entity;
  }
  removeEntity(entity: EntityRaw) {
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
  queryEntities<T extends CompFunc | Tag>(comps: CompFuncList<T>): QueryType<CompFuncList<T>>[] {
    const tags = comps.map((c) =>
      typeof c === 'string' ? c : (c as CompFunc).id
    ) as Tag[];
    const results: QueryType<CompFuncList<T>>[][] = [];
    const queryArchetype = getArchetype(tags);
    for (const [archetype, entities] of this.archetypes) {
      if ((queryArchetype & archetype) === queryArchetype) {
      results.push(entities as QueryType<CompFuncList<T>>[]);
      }
    }
    return ([] as QueryType<CompFuncList<T>>[]).concat(...results);
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
