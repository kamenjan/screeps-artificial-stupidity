/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BuilderState, CreepsByRole, CustomCreep, HarvesterState, UpgraderState, creepRole } from "./models";
import { ErrorMapper } from "utils/ErrorMapper";

// import _ from "lodash";

/**
 * Initialization stuff (also runes on every live code update)
 * - set up memory objects
 */
function init() {
  // find energy sources on room and set up state for each.
  // this state will be updated by creeps that are using that source
  // so that consumers (harvesters, upgraders, builders) are spread evenly

  console.log("init");
  // loop through all controlled/owned rooms and set energy sources in
  // their memory, so i can track how many creeps are mining a source
  // and redirect them accordingly. because init code also runes on every
  // live code update make sure we don't reset existing state
  for (const r in Game.rooms) {
    const room = Game.rooms[r];
    const sources = room.find(FIND_SOURCES_ACTIVE);
    if (!room.memory.sources) {
      room.memory.sources = {};
      for (const source of sources) {
        console.log("pushing source to room memory");
        room.memory.sources[source.id] = {
          harvesters: []
        };
      }
    }
  }
}

init();

/**
 * Main loop
 * - iterate over creeps and execute their tick logic based on their respective roles
 * - iterate over spawns and execute spawning logic for each
 */
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // run all spawns
  for (const name in Game.spawns) runSpawn(Game.spawns[name]);

  // run all creeps
  for (const name in Game.creeps) runCreep(Game.creeps[name] as CustomCreep);

  console.log(`CPU used this tick: ${Game.cpu.getUsed()}`);
  console.log(`------------------------`);
});

/**
 * spawning logic
 * - check if additional creeps should be spawned
 */
function runSpawn(spawn: StructureSpawn) {
  // game.spawns
  const room = spawn.room;
  // creeps in spawn's room
  const creeps = room.find(FIND_MY_CREEPS) as CustomCreep[];

  const availableEnergy = room.energyAvailable;
  const maxEnergy = room.energyCapacityAvailable;

  console.log(`Room energy: ${availableEnergy}/${maxEnergy}`);

  const isSpawning = spawn.spawning;

  // set to 400, cause thats the current price of screep
  if (isSpawning || availableEnergy < 500) {
    // just nope the fuck out and don't do any further calculations
    return;
  }

  // object with creepRole properties and creep[] values
  const creepsByRole: CreepsByRole = creeps.reduce(
    (roles: CreepsByRole, creep: CustomCreep) => ({
      ...roles,
      [creep.memory.role]: [...roles[creep.memory.role], creep]
    }),
    {
      // TODO: this should be dynamic, based on creepRole enum
      HARVESTER: [],
      UPGRADER: [],
      REPAIRER: [],
      BUILDER: []
    }
  );

  // spawn harvesters
  if (creepsByRole.HARVESTER.length < 2) {
    return spawnHarvester(spawn, availableEnergy);
  }

  // spawn upgraders
  if (creepsByRole.UPGRADER.length < 2) {
    return spawnUpgrader(spawn, availableEnergy);
  }

  if (creepsByRole.BUILDER.length < 2) {
    return spawnBuilder(spawn, availableEnergy);
  }

  // if (creepsByRole.REPAIRER.length === 0) {
  //   return spawnRepairer(spawn, availableEnergy);
  // }
}

/**
 * creep spawn logic for each role
 * - which parts
 * - initial state
 */
function spawnHarvester(spawn: StructureSpawn, energy: number) {
  // const body: BodyPartConstant[] = [];
  const body: BodyPartConstant[] = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

  // let maxEnergy = energy;
  // let maxBodyParts = 50;
  // while (maxBodyParts >= 4 && maxEnergy >= 300) {
  //   body.push(WORK);
  //   body.push(WORK);
  //   body.push(CARRY);
  //   body.push(MOVE);
  //   maxBodyParts -= 4;
  //   maxEnergy -= 300;
  // }
  spawn.spawnCreep(body, generateCreepName(creepRole.HARVESTER), {
    memory: { role: creepRole.HARVESTER, room: spawn.room.name, isEmpty: true }
  });
}

function spawnUpgrader(spawn: StructureSpawn, energy: number) {
  // const body: BodyPartConstant[] = [];
  const body: BodyPartConstant[] = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

  // let maxEnergy = energy;
  // let maxBodyParts = 50;
  // while (maxBodyParts >= 4 && maxEnergy >= 300) {
  //   body.push(WORK);
  //   body.push(WORK);
  //   body.push(CARRY);
  //   body.push(MOVE);
  //   maxBodyParts -= 4;
  //   maxEnergy -= 300;
  // }

  spawn.spawnCreep(body, generateCreepName(creepRole.UPGRADER), {
    memory: { role: creepRole.UPGRADER, room: spawn.room.name, isEmpty: true }
  });
}

function spawnBuilder(spawn: StructureSpawn, energy: number) {
  const body: BodyPartConstant[] = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

  // let maxEnergy = energy;
  // let maxBodyParts = 50;
  // while (maxBodyParts >= 4 && maxEnergy >= 300) {
  //   body.push(WORK);
  //   body.push(WORK);
  //   body.push(CARRY);
  //   body.push(MOVE);
  //   maxBodyParts -= 4;
  //   maxEnergy -= 300;
  // }

  spawn.spawnCreep(body, generateCreepName(creepRole.BUILDER), {
    memory: { role: creepRole.BUILDER, room: spawn.room.name, isEmpty: true }
  });
}

function spawnRepairer(spawn: StructureSpawn) {
  const body: BodyPartConstant[] = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
  spawn.spawnCreep(body, generateCreepName(creepRole.REPAIRER), {
    memory: { role: creepRole.REPAIRER, room: spawn.room.name, isEmpty: true }
  });
}

/**
 * barrel function for running creep roles
 */
function runCreep(creep: CustomCreep) {
  const run = {
    [creepRole.HARVESTER]: runHarvester,
    [creepRole.UPGRADER]: runUpgrader,
    [creepRole.BUILDER]: runBuilder,
    [creepRole.REPAIRER]: runUpgrader
  };
  run[creep.memory.role](creep);
}

/**
 * creep run logic for each role
 */
function runHarvester(creep: Creep) {
  const state = creep.memory as HarvesterState;

  if (state.isHarvesting && state.sourceId) {
    if (isFull(creep.store)) {
      state.isFull = true;
      state.isHarvesting = false;
      unsubscribeFromSource(creep);
      state.destinationId = findSpawnOrExtensionId(creep);
    } else {
      const source = Game.getObjectById(state.sourceId);
      if (source) creep.harvest(source);
    }
  }

  if (state.isUnloading) {
    // if unloading
    if (isEmpty(creep.store)) {
      // if creep empty, go harvesting
      state.isEmpty = true;
      state.isUnloading = false;
      state.sourceId = findEnergySourceId(creep);
    } else if (state.destinationId) {
      // if creep still has unloading destination id stored in state
      const destination = Game.getObjectById(state.destinationId);
      if (destination) {
        const transferResponse = creep.transfer(destination, RESOURCE_ENERGY);
        if (transferResponse === ERR_FULL) {
          state.destinationId = findSpawnOrExtensionId(creep);
        } else if (transferResponse === ERR_NOT_IN_RANGE) {          
          creep.moveTo(destination, { visualizePathStyle: { stroke: "#ffaa00" } });
        }
      }
    } else {
      // ... or try to find new destination
      state.destinationId = findSpawnOrExtensionId(creep);
    }
  }

  if (state.isEmpty) {
    // find nearest energy source id if it is not already in state/memory
    if (!state.sourceId) state.sourceId = findEnergySourceId(creep);
    if (!state.sourceId) return;
    // get source object by its id
    const source = Game.getObjectById(state.sourceId);
    if (!source) return;
    // if in range, start mining and set empty to false
    if (creep.pos.inRangeTo(source, 1)) {
      creep.harvest(source);
      state.isHarvesting = true;
      state.isEmpty = false;
    } else {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
    }
  }

  if (state.isFull) {
    if (!state.destinationId) state.destinationId = findSpawnOrExtensionId(creep);
    if (!state.destinationId) return;
    const destination = Game.getObjectById(state.destinationId);
    if (!destination) return;
    // if in range, start unloading energy
    if (creep.pos.inRangeTo(destination, 1)) {
      const transferResponse = creep.transfer(destination, RESOURCE_ENERGY);
      if (transferResponse === OK) {
        state.isUnloading = true;
        state.isFull = false;
      } else if (transferResponse === ERR_FULL) {
        state.destinationId = findSpawnOrExtensionId(creep);
      }
    } else {
      // else move closer
      creep.moveTo(destination, { visualizePathStyle: { stroke: "#ffaa00" } });
    }
  }
}

function runUpgrader(creep: Creep) {
  const state = creep.memory as UpgraderState;

  if (state.isHarvesting) {
    if (isFull(creep.store)) {
      state.isFull = true;
      state.isHarvesting = false;
      unsubscribeFromSource(creep);
      state.controllerId = findControllerId(creep);
    } else {
      if (state.sourceId) {
        const source = Game.getObjectById(state.sourceId);
        if (source) creep.harvest(source);
      } else {
        state.sourceId = findEnergySourceId(creep);
      }
    }
  }

  if (state.isUnloading) {
    if (isEmpty(creep.store)) {
      state.isEmpty = true;
      state.isUnloading = false;
      state.sourceId = findEnergySourceId(creep);
    } else if (state.controllerId) {
      const controller = Game.getObjectById(state.controllerId);
      if (controller) creep.upgradeController(controller);
    } else {
      state.controllerId = findControllerId(creep);
    }
  }

  if (state.isEmpty) {
    // find nearest energy source id if it is not already in state/memory
    if (!state.sourceId) state.sourceId = findEnergySourceId(creep);
    // if there is none, fuck it, do nothing
    if (!state.sourceId) return;
    // get source object by its id
    const source = Game.getObjectById(state.sourceId);
    if (!source) return;
    // if in range, start mining and set empty to false
    if (creep.pos.inRangeTo(source, 1)) {
      creep.harvest(source);
      state.isHarvesting = true;
      state.isEmpty = false;
    } else {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#3b3" } });
    }
  }

  if (state.isFull) {
    state.isHarvesting = false;
    if (!state.controllerId) state.controllerId = findControllerId(creep);
    if (!state.controllerId) return;
    const controller = Game.getObjectById(state.controllerId);
    if (!controller) return;
    // if in range, start upgrading controller
    if (creep.pos.inRangeTo(controller, 3)) {
      creep.upgradeController(controller);
      state.isUnloading = true;
      state.isFull = false;
    } else {
      // else move closer
      creep.moveTo(controller, { visualizePathStyle: { stroke: "#3b3" } });
    }
  }
}

function runBuilder(creep: Creep) {
  const state = creep.memory as BuilderState;

  // if building, keep on building
  if (state.isBuilding) {
    if (isEmpty(creep.store)) {
      state.isEmpty = true;
      state.isBuilding = false;
      state.constructionId = undefined;
      state.sourceId = findEnergySourceId(creep);
    } else if (state.constructionId) {
      // check if construction site still exists and keep working
      const constructionSite = Game.getObjectById(state.constructionId);

      if (constructionSite) {
        const buildResponse = creep.build(constructionSite);
        if (buildResponse === ERR_NOT_IN_RANGE) {
          creep.moveTo(constructionSite, { visualizePathStyle: { stroke: "#ffaa00" } });
        }
      } else {
        // state.isBuilding = false;
        state.constructionId = findConstructionSiteId(creep);
      }
    } else {
      state.constructionId = findConstructionSiteId(creep);
    }
  }

  // if harvesting, keep on harvesting
  if (state.isHarvesting && state.sourceId) {
    if (isFull(creep.store)) {
      state.isFull = true;
      unsubscribeFromSource(creep);
      state.constructionId = findConstructionSiteId(creep);
    } else {
      const source = Game.getObjectById(state.sourceId);
      if (source) creep.harvest(source);
    }
  }

  // if empty, go harvest
  if (state.isEmpty) {
    if (!state.sourceId) state.sourceId = findEnergySourceId(creep);
    if (!state.sourceId) return;
    const source = Game.getObjectById(state.sourceId);
    if (!source) return;
    if (creep.pos.inRangeTo(source, 1)) {
      creep.harvest(source);
      state.isHarvesting = true;
      state.isEmpty = false;
    } else {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#1ff" } });
    }
  }

  // if full, check if there is anything to build
  if (state.isFull) {
    state.isHarvesting = false;
    state.constructionId = findConstructionSiteId(creep);

    if (!state.constructionId) {
      return;
    }

    const constructionSite = Game.getObjectById(state.constructionId);
    if (!constructionSite) return;
    // if in range, start building
    if (creep.pos.inRangeTo(constructionSite, 3)) {
      creep.build(constructionSite);
      state.isBuilding = true;
      state.isFull = false;
    } else {
      // else move closer
      creep.moveTo(constructionSite, { visualizePathStyle: { stroke: "#1ff" } });
    }
  }
}

/**
 * creep util functions
 */
function generateCreepName(r: creepRole): string {
  const id = Game.time.toString().slice(Game.time.toString().length - 4);
  return `${r.charAt(0)}-${id}`;
}

function findSpawnOrExtensionId(creep: Creep): Id<StructureExtension | StructureSpawn> | undefined {
  // TODO: should prioritize extensions
  const targets = creep.room.find(FIND_STRUCTURES, {
    filter: structure =>
      (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) &&
      structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  });
  return targets.length > 0 ? (targets[0].id as Id<StructureExtension | StructureSpawn>) : undefined;
}

// finds appropriate energy source in the same room creep is in
function findEnergySourceId(creep: Creep): Id<Source> | undefined {
  const sources = creep.room.find(FIND_SOURCES_ACTIVE);
  // return source with the least active harvesters
  const source = sources.reduce((prev, curr) => {
    const currNr = creep.room.memory.sources[curr.id].harvesters.length;
    const prevNr = creep.room.memory.sources[prev.id].harvesters.length;
    return currNr < prevNr ? curr : prev;
  });
  creep.room.memory.sources[source.id].harvesters.push(creep.id);
  return source.id;
}

function unsubscribeFromSource(creep: Creep): void {
  const memory = creep.memory as HarvesterState | BuilderState | UpgraderState;
  const sources = creep.room.memory.sources;
  if (memory.sourceId) {
    const registeredSourceHarvesters = sources[memory.sourceId].harvesters;
    const index = registeredSourceHarvesters.indexOf(creep.id);
    if (index > -1) registeredSourceHarvesters.splice(index, 1);
  }
}

function findControllerId(creep: Creep): Id<StructureController> | undefined {
  return creep.room.controller ? creep.room.controller.id : undefined;
}

function findConstructionSiteId(creep: Creep): Id<ConstructionSite<BuildableStructureConstant>> | undefined {
  const targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  return targets.length > 0 ? targets[0].id : undefined;
}

/**
 * store util functions
 */
function isFull(s: StoreDefinition): boolean {
  return s.getUsedCapacity() === s.getCapacity();
}

function isEmpty(s: StoreDefinition): boolean {
  return s.getFreeCapacity() === s.getCapacity();
}
