import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { InspectableType } from '@babylonjs/core/Misc/iInspectable';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import { Node } from '@babylonjs/core/node';
import {
  CompFunc,
  CompFuncList,
  CompList,
  EntityQuery,
  World,
  addEntity,
  defaultWorld,
  removeEntity,
} from './ecs';

// --- BJS Components ---

// Node
export const node = (node: Node) => ({
  id: 'node',
  dispose: () => {
    if (node.metadata.entity) {
      node.metadata.entity = undefined;
      node.dispose();
    }
  },
  node,
});
node.id = 'node';
type NodeQueryDefaultComps = typeof node;

// Xform
export const xform = (xform: TransformNode) => ({
  id: 'xform',
  xform,
});
xform.id = 'xform';
type XformQueryDefaultComps = typeof node | typeof xform;

// MeshComp
export const mesh = (mesh: AbstractMesh) => ({
  id: 'mesh',
  mesh,
});
mesh.id = 'mesh';
type MeshQueryDefaultComps = typeof mesh | XformQueryDefaultComps;

// PhysicsBody
export const physicsBody = (physicsBody: PhysicsBody) => ({
  id: 'physicsBody',
  physicsBody,
});
physicsBody.id = 'physicsBody';

// --- BJS specific Queries ---
type DefaultCompEntityQuery<
  T extends CompFunc,
  D extends CompFunc
> = EntityQuery<T extends { name: string } ? T | D : D>;

declare module './ecs' {
  export interface World {
    addNodeEntity<T extends { id: string }>(
      bjsNode: Node,
      comps: CompList<T>
    ): void;
    queryNodes<T extends CompFunc>(
      comps: CompFuncList<T>
    ): DefaultCompEntityQuery<T, NodeQueryDefaultComps>[];
    queryXforms<T extends CompFunc>(
      comps: CompFuncList<T>
    ): DefaultCompEntityQuery<T, XformQueryDefaultComps>[];
    queryMeshes<T extends CompFunc>(
      comps: CompFuncList<T>
    ): DefaultCompEntityQuery<T, MeshQueryDefaultComps>[];
  }
}

World.prototype.addNodeEntity = function <T extends { id: string }>(
  bjsNode: Node,
  comps: CompList<T>
) {
  bjsNode.metadata ??= {};
  if (bjsNode instanceof TransformNode) {
    const xformNode = bjsNode as TransformNode;
    comps.push(xform(xformNode) as unknown as T);

    if (xformNode.physicsBody) {
      comps.push(physicsBody(xformNode.physicsBody) as unknown as T);
    }

    if (bjsNode instanceof Mesh) {
      const meshNode = bjsNode as Mesh;
      comps.push(mesh(meshNode) as unknown as T);
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
    },
    archetype: {
      get: () => entity.archetype.toString(),
      enumerable: true,
    },
  });
  bjsNode.inspectableCustomProperties.push(
    {
      label: `Entity ID`,
      propertyName: 'entityId',
      type: InspectableType.String,
    },
    {
      label: `Archetype`,
      propertyName: 'archetype',
      type: InspectableType.String,
    },
    {
      label: `Components`,
      propertyName: 'entityId',
      type: InspectableType.Options,
      options: comps.map((c) => {
        let id: string;
        if (typeof c === 'string') {
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
};

/**
 * Add a BabylonJS Node as an entity.
 * Following components are added by default:
 * - NodeComp
 * - XformComp if the node is a TransformNode
 * - PhysicsBodyComp if the node has a physicsBody property
 * @param bjsNode The BabylonJS Node to add use as the entity
 * @param comps A list of components to add to the entity
 */
export const addNodeEntity = defaultWorld.addNodeEntity.bind(defaultWorld);

// --- BJS specific Queries ---
World.prototype.queryNodes = function <T extends CompFunc>(
  comps: CompFuncList<T>
): DefaultCompEntityQuery<T, NodeQueryDefaultComps>[] {
  return this.queryEntities([node, ...comps]) as DefaultCompEntityQuery<
    T,
    NodeQueryDefaultComps
  >[];
};

/**
 * Query for Node entities, i.e. entities with node component.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export const queryNodes = defaultWorld.queryNodes.bind(defaultWorld);

World.prototype.queryXforms = function <T extends CompFunc>(
  comps: CompFuncList<T>
): DefaultCompEntityQuery<T, XformQueryDefaultComps>[] {
  return this.queryEntities([node, xform, ...comps]) as DefaultCompEntityQuery<
    T,
    XformQueryDefaultComps
  >[];
};

/**
 * Query for Xform entities, i.e. entities with XformComp and NodeComp.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export const queryXforms = defaultWorld.queryXforms.bind(defaultWorld);

World.prototype.queryMeshes = function <T extends CompFunc>(
  comps: CompFuncList<T>
): DefaultCompEntityQuery<T, MeshQueryDefaultComps>[] {
  return this.queryEntities([
    node,
    xform,
    mesh,
    ...comps,
  ]) as DefaultCompEntityQuery<T, MeshQueryDefaultComps>[];
};

/**
 * Query for Mesh entities, i.e. entities with Mesh, XformComp and NodeComp.
 * @param comps list of additional components or tags the entity should have
 * @returns list of entities that match the query
 */
export const queryMeshes = defaultWorld.queryMeshes.bind(defaultWorld);
