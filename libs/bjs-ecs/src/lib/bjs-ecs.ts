import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { InspectableType } from '@babylonjs/core/Misc/iInspectable';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import { Node } from '@babylonjs/core/node';
import {
  Comp,
  CompFunc,
  CompFuncList,
  CompsListType,
  EntityRaw,
  QueryType,
  Tag,
  World,
  addEntity,
  createComponent,
  defaultWorld,
  removeEntity
} from './ecs';

// --- BJS Components ---

// Node
export const node = (node: Node) => ({
  id: 'node' as const,
  dispose: () => {
    if (node.metadata.entity) {
      node.metadata.entity = undefined;
      node.dispose();
    }
  },
  value: node,
});
node.id = 'node' as const;
type NodeComp = ReturnType<typeof node>;
type NodeQueryDefaultComps = typeof node;

// Xform
export const xform = createComponent('xform', (xform: TransformNode) => xform);
type XformQueryDefaultComps = typeof xform | NodeQueryDefaultComps;

// MeshComp
export const mesh = createComponent('mesh', (mesh: AbstractMesh) => ({
  mesh,
}));
type MeshQueryDefaultComps = typeof mesh | XformQueryDefaultComps;

// PhysicsBody
export const physicsBody = createComponent(
  'physicsBody',
  (physicsBody: PhysicsBody) => ({
    physicsBody,
  })
);

// --- BJS specific Queries ---
type DefaultCompEntityQuery<T extends CompFunc | Tag, D extends CompFunc> = QueryType<
  CompFuncList<T extends { id: string } ? T | D : D>
>;

declare module './ecs' {
  export interface World {
    addNodeEntity<T extends Array<Comp | string>>(
      bjsNode: Node,
      comps: T
    ): EntityRaw & CompsListType<T | NodeComp[]>;

    queryNodes<T extends CompFunc | Tag>(
      comps: CompFuncList<T>
    ): DefaultCompEntityQuery<T, NodeQueryDefaultComps>[];
    queryXforms<T extends CompFunc | Tag>(
      comps: CompFuncList<T>
    ): DefaultCompEntityQuery<T, XformQueryDefaultComps>[];
    queryMeshes<T extends CompFunc | Tag>(
      comps: CompFuncList<T>
    ): DefaultCompEntityQuery<T, MeshQueryDefaultComps>[];
  }
}

World.prototype.addNodeEntity = function <T extends Array<Comp | string>>(
  bjsNode: Node,
  comps: T
): EntityRaw & CompsListType<T | NodeComp[]> {
  bjsNode.metadata ??= {};
  if (bjsNode instanceof TransformNode) {
    const xformNode = bjsNode as TransformNode;
    comps.push(xform(xformNode) as unknown as T[0]);

    if (xformNode.physicsBody) {
      comps.push(physicsBody(xformNode.physicsBody) as unknown as T[0]);
    }

    if (bjsNode instanceof Mesh) {
      const meshNode = bjsNode as Mesh;
      comps.push(mesh(meshNode) as unknown as T[0]);
    }
  }
  comps.push(node(bjsNode) as unknown as T[0]);
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
  return entity as EntityRaw & CompsListType<T | NodeComp[]>;
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
World.prototype.queryNodes = function <T extends CompFunc | Tag>(
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

World.prototype.queryXforms = function <T extends CompFunc | Tag>(
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

World.prototype.queryMeshes = function <T extends CompFunc | Tag>(
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
