import { Node } from "@babylonjs/core/node";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InspectableType } from "@babylonjs/core";

export type Tag = string;
export interface Comp {
  id: Tag;
}
export type CompList<T> = Array<T | Tag>;

// component properties that should NOT propagate to entity
const COMP_DESC = new Set(["id"]);

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
  };
  for (const comp of comps) {
    ent.addComp(comp as Comp | Tag);
  }

  return ent as unknown as Entity<T>;
}

// --- components ---

// NodeComp
export const nodeComp = (node: Node) => ({
  id: "node",
  node,
  get name() {
    return node.name;
  },
});
nodeComp.id = "node";

// XformComp
export const xformComp = (xform: TransformNode) => ({
  id: "xform",
  xform,
});
xformComp.id = "xform";

// MeshComp
export const meshComp = (mesh: AbstractMesh) => ({
  id: "mesh",
  mesh,
});
meshComp.id = "mesh";

// PhysicsBodyComp
export const physicsBodyComp = (physicsBody: PhysicsBody) => ({
  id: "physicsBody",
  physicsBody,
});
physicsBodyComp.id = "physicsBody";

// --- world ---
export const world: Entity[] = [];

/**
 * Add a BabylonJS Node as an entity.
 * Following components are added by default:
 * - NodeComp
 * - XformComp if the node is a TransformNode
 * - PhysicsBodyComp if the node has a physicsBody property
 * @param node The BabylonJS Node to add use as the entity
 * @param comps A list of components to add to the entity
 */
export function addEntity<T>(node: Node, comps: CompList<T>) {
  node.metadata ??= {};
  if (node instanceof TransformNode) {
    const xform = node as TransformNode;
    comps.push(xformComp(xform) as T);

    if (xform.physicsBody) {
      comps.push(physicsBodyComp(xform.physicsBody) as T);
    }
  }
  comps.push(nodeComp(node) as T);
  const entity = make(comps);

  // inspector support
  node.inspectableCustomProperties ??= [];
  node.inspectableCustomProperties.push(
    {
      label: `Entity ID: ${entity.id}`,
      propertyName: "",
      type: InspectableType.Tab,
    },
    {
      // label must be uniqie to avoid inspector issue, with different nodes showing same options
      label: `Components: \n${entity.id}`,
      propertyName: "",
      type: InspectableType.Options,
      options: comps.map((c) => {
        let id: string;
        if (typeof c === "string") {
          id = c;
        } else {
          id = (c as {id:string}).id;
        }
        return { label: id, value: id};
      })
    },
  )
  node.metadata.entity = entity;
  world.push(entity);

  node.onDisposeObservable.addOnce(() => {
    if (node.metadata.entity) {
      removeEntityFromWorld(entity);
      node.metadata.entity = undefined;
    }
  });
}

function removeEntityFromWorld(entity: Entity) {
  const index = world.indexOf(entity);
  if (index !== -1) {
    world.splice(index, 1);
  }
}

export function removeEntity(entity: Entity) {
  removeEntityFromWorld(entity);
  // also remove BJS if this is a node
  const nodeC = entity.comp("node") as ReturnType<typeof nodeComp> | undefined;
  if (nodeC) {
    nodeC.node.metadata.entity = undefined;
    nodeC.node.dispose();
  }
}

// --- query ---
type CompFuncList<T> = Array<T | Tag>;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type ReturnTypeOFUnion<T extends (...args: any[]) => any> = ReturnType<T>;
type EntityQuery<T extends (...args: any[]) => any> = EntityRaw &
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

type NodeQueryDefaultComps = typeof nodeComp;
/**
 * Query for Node entities, i.e. entities with NodeComp.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export function queryNodes<T extends (...args: any[]) => any>(
  comps: CompFuncList<T>
): EntityQuery<
  T extends { id: string } ? T | NodeQueryDefaultComps : NodeQueryDefaultComps
>[] {
  const tags = comps.map((c) =>
    typeof c === "string" ? c : (c as any).id
  ) as Tag[];
  tags.push(nodeComp.id);
  return world.filter((e) => e.is(tags)) as any;
}

type XformQueryDefaultComps = typeof nodeComp | typeof xformComp;
/**
 * Query for Xform entities, i.e. entities with XformComp and NodeComp.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export function queryXforms<T extends (...args: any[]) => any>(
  comps: CompFuncList<T>
): EntityQuery<
  T extends { id: string } ? T | XformQueryDefaultComps : XformQueryDefaultComps
>[] {
  const tags = comps.map((c) =>
    typeof c === "string" ? c : (c as any).id
  ) as Tag[];
  tags.push(nodeComp.id, xformComp.id);
  return world.filter((e) => e.is(tags)) as any;
}
