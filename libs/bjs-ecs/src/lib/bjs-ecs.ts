import { InspectableType } from "@babylonjs/core";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import { Node } from "@babylonjs/core/node";
import {
  CompFunc,
  CompFuncList,
  CompList,
  EntityQuery,
  Tag,
  addEntity,
  removeEntity,
  world,
} from "./ecs";

// --- BJS Components ---

// Node
export const node = (node: Node) => ({
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

// Xform
export const xform = (xform: TransformNode) => ({
  id: "xform",
  xform,
});

// MeshComp
export const mesh = (mesh: AbstractMesh) => ({
  id: "mesh",
  mesh,
});

// PhysicsBody
export const physicsBody = (physicsBody: PhysicsBody) => ({
  id: "physicsBody",
  physicsBody,
});

/**
 * Add a BabylonJS Node as an entity.
 * Following components are added by default:
 * - NodeComp
 * - XformComp if the node is a TransformNode
 * - PhysicsBodyComp if the node has a physicsBody property
 * @param bjsNode The BabylonJS Node to add use as the entity
 * @param comps A list of components to add to the entity
 */
export function addNodeEntity<T>(bjsNode: Node, comps: CompList<T>) {
  bjsNode.metadata ??= {};
  if (bjsNode instanceof TransformNode) {
    const xformNode = bjsNode as TransformNode;
    comps.push(xform(xformNode) as unknown as T);

    if (xformNode.physicsBody) {
      comps.push(physicsBody(xformNode.physicsBody) as unknown as T);
    }
  }
  comps.push(node(bjsNode) as unknown as T);
  const entity = addEntity(comps);

  // inspector support
  bjsNode.inspectableCustomProperties ??= [];
  Object.defineProperties(bjsNode, {
    entityId: {
      get: () => entity.id.toFixed(),
      enumerable: true,
    }
  });
  bjsNode.inspectableCustomProperties.push(
    {
      label: `Entity ID`,
      propertyName: "entityId",
      type: InspectableType.String,
    },
    {
      label: `Components`,
      propertyName: "entityId",
      type: InspectableType.Options,
      options: comps.map((c) => {
        let id: string;
        if (typeof c === "string") {
          id = c;
        } else {
          id = (c as unknown as { id: string }).id;
        }
        return { label: id, value: id };
      }),
    }
  );
  bjsNode.metadata.entity = entity;

  // remove entity when node is disposed
  bjsNode.onDisposeObservable.addOnce(() => {
    if (bjsNode.metadata.entity) {
      bjsNode.metadata.entity = undefined;
      removeEntity(entity);
    }
  });
}

// --- BJS specific Queries ---
type DefaultCompEntityQuery<T extends CompFunc, D extends CompFunc>
  = EntityQuery<
  T extends { id: string } ? T | D : D
>

type NodeQueryDefaultComps = typeof node;
/**
 * Query for Node entities, i.e. entities with node component.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export function queryNodes<T extends CompFunc>(
  comps: CompFuncList<T>
): DefaultCompEntityQuery<T, NodeQueryDefaultComps>[] {
  const tags = comps.map((c) =>
    typeof c === "string" ? c : (c as CompFunc).name
  ) as Tag[];
  tags.push(node.name);
  return world.filter((e) => e.is(tags)) as DefaultCompEntityQuery<T, NodeQueryDefaultComps>[];
}

type XformQueryDefaultComps = typeof node | typeof xform;
/**
 * Query for Xform entities, i.e. entities with XformComp and NodeComp.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export function queryXforms<T extends CompFunc>(
  comps: CompFuncList<T>
): DefaultCompEntityQuery<T, XformQueryDefaultComps>[] {
  const tags = comps.map((c) =>
    typeof c === "string" ? c : (c as CompFunc).name
  ) as Tag[];
  tags.push(node.name, xform.name);
  return world.filter((e) => e.is(tags)) as DefaultCompEntityQuery<T, XformQueryDefaultComps>[];
}
