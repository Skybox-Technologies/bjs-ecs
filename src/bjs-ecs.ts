import { InspectableType } from "@babylonjs/core";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import { Node } from "@babylonjs/core/node";
import {
  CompFuncList,
  CompList,
  EntityQuery,
  Tag,
  addEntity,
  removeEntity,
  world,
} from "./ecs";

// --- BJS Components ---

// NodeComp
export const nodeComp = (node: Node) => ({
  id: "node",
  dispose: () => {
    if (node.metadata.entity) {
      node.metadata.entity = undefined;
      node.dispose();
    }
  },
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

/**
 * Add a BabylonJS Node as an entity.
 * Following components are added by default:
 * - NodeComp
 * - XformComp if the node is a TransformNode
 * - PhysicsBodyComp if the node has a physicsBody property
 * @param node The BabylonJS Node to add use as the entity
 * @param comps A list of components to add to the entity
 */
export function addNodeEntity<T>(node: Node, comps: CompList<T>) {
  node.metadata ??= {};
  if (node instanceof TransformNode) {
    const xform = node as TransformNode;
    comps.push(xformComp(xform) as T);

    if (xform.physicsBody) {
      comps.push(physicsBodyComp(xform.physicsBody) as T);
    }
  }
  comps.push(nodeComp(node) as T);
  const entity = addEntity(comps);

  // inspector support
  node.inspectableCustomProperties ??= [];
  node.inspectableCustomProperties.push(
    {
      label: `Entity ID: ${entity.id}`,
      propertyName: "",
      type: InspectableType.Tab,
    },
    {
      // label must be unique to avoid inspector issue, with different nodes showing same options
      label: `Components: \n${entity.id}`,
      propertyName: "",
      type: InspectableType.Options,
      options: comps.map((c) => {
        let id: string;
        if (typeof c === "string") {
          id = c;
        } else {
          id = (c as { id: string }).id;
        }
        return { label: id, value: id };
      }),
    }
  );
  node.metadata.entity = entity;

  // remove entity when node is disposed
  node.onDisposeObservable.addOnce(() => {
    if (node.metadata.entity) {
      node.metadata.entity = undefined;
      removeEntity(entity);
    }
  });
}

// --- BJS specific Queries ---
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
