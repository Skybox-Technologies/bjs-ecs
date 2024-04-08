import mitt from "mitt";

export type Tag = string;
export interface Comp {
  id: Tag;
  dispose?: () => void;
}
export type CompList<T> = Array<T | Tag>;

// component properties that should NOT propagate to entity
const COMP_DESC = new Set(["id", "dispose"]);

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

export function make<T>(comps: CompList<T> = []): Entity<T> {
  const compStates = new Map<Tag, Comp>();
  const ent: EntityRaw = {
    id: uid(),

    comp(id: Tag): Comp | undefined {
      return compStates.get(id);
    },

    // add a comp, or tag
    addComp(comp: Comp | Tag): void {
      if (!comp) {
        return;
      }

      // tag
      if (typeof comp === "string") {
        return this.addComp({
          id: comp,
        });
      }

      //TODO: see https://github.com/replit/kaboom/blob/master/src/kaboom.ts#L2868
      compStates.set(comp.id, comp);

      for (const k in comp) {
        if (COMP_DESC.has(k)) {
          continue;
        }
        const prop = Object.getOwnPropertyDescriptor(comp, k);

        if (prop) {
          if (typeof prop.value === "function") {
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
      if (tag === "*") {
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
      compStates.forEach((comp) => {
        if(comp.dispose) {
          comp.dispose();
        }
      })
    },
  };
  for (const comp of comps) {
    ent.addComp(comp as Comp | Tag);
  }

  return ent as unknown as Entity<T>;
}

// --- world ---
export const world: Entity[] = [];

export type EntityEvents = {
  add: Entity;
  remove: Entity;
};
export const entityEvents = mitt<EntityEvents>();

/**
 * Add an entity to the world.
 * @param comps A list of components to add to the entity
 */
export function addEntity<T>(comps: CompList<T>): Entity<T> {
  const entity = make(comps);
  world.push(entity);
  entityEvents.emit('add', entity);
  return entity;
}

export function removeEntity(entity: Entity) {
  const index = world.indexOf(entity);
  if (index !== -1) {
    const removed = world.splice(index, 1);
    removed.forEach((e) => {
      if (e.dispose) {
        e.dispose();
      }
    });
  }
}

// --- query ---
export type CompFuncList<T> = Array<T | Tag>;
type ReturnTypeOFUnion<T extends (...args: any[]) => any> = ReturnType<T>;
export type EntityQuery<T extends (...args: any[]) => any> = EntityRaw &
  MergeComps<ReturnTypeOFUnion<T>>;

/**
 * Generic query for entities.
 * @param comps list of components or tags the entity should have
 * @returns list of entities that match the query
 */
export function queryEntities<T extends (...args: any[]) => any>(
  comps: CompFuncList<T>
): EntityQuery<T>[] {
  const tags = comps.map((c) =>
    typeof c === "string" ? c : (c as any).id
  ) as Tag[];
  return world.filter((e) => e.is(tags)) as unknown as EntityQuery<T>[];
}
