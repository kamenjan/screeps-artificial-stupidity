/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BuilderState, CreepsByRole, CustomCreep, HarvesterState, UpgraderState, creepRole } from "./models";
import { ErrorMapper } from "utils/ErrorMapper";

// When compiling TS to JS and bundling with rollup, the line numbers and
// file names in error messages change. This utility uses source maps to
// get the line numbers and file names of the original, TS source code
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

  console.log(Game.cpu.getUsed());
});

function runSpawn(spawn: StructureSpawn) {
  // game.spawns
  const room = spawn.room;
  // creeps in spawn's room
  const creeps = room.find(FIND_MY_CREEPS) as CustomCreep[];
  // const maxEnergy = room.energyCapacityAvailable;

  const availableEnergy = room.energyAvailable;
  const isSpawning = spawn.spawning;

  // spawning in progress or not enough energy for a spawn
  if (isSpawning || availableEnergy < 200) {
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
  if (creepsByRole.HARVESTER.length === 0) {
    return spawnHarvester(spawn);
  }

  // spawn upgraders
  if (creepsByRole.UPGRADER.length < 2) {
    return spawnUpgrader(spawn);
  }

  if (creepsByRole.BUILDER.length === 0) {
    return spawnBuilder(spawn);
  }

  if (creepsByRole.REPAIRER.length === 0) {
    return spawnRepairer(spawn);
  }
}

function spawnHarvester(spawn: StructureSpawn) {
  spawn.spawnCreep([WORK, CARRY, MOVE], generateCreepName(creepRole.HARVESTER), {
    memory: { role: creepRole.HARVESTER, room: spawn.room.name, isEmpty: true }
  });
}

function spawnUpgrader(spawn: StructureSpawn) {
  spawn.spawnCreep([WORK, CARRY, MOVE], generateCreepName(creepRole.UPGRADER), {
    memory: { role: creepRole.UPGRADER, room: spawn.room.name, isEmpty: true }
  });
}

function spawnBuilder(spawn: StructureSpawn) {
  spawn.spawnCreep([WORK, CARRY, MOVE], generateCreepName(creepRole.BUILDER), {
    memory: { role: creepRole.BUILDER, room: spawn.room.name, isEmpty: true }
  });
}

function spawnRepairer(spawn: StructureSpawn) {
  spawn.spawnCreep([WORK, CARRY, MOVE], generateCreepName(creepRole.REPAIRER), {
    memory: { role: creepRole.REPAIRER, room: spawn.room.name, isEmpty: true }
  });
}

function runCreep(creep: CustomCreep) {
  const run = {
    [creepRole.HARVESTER]: runHarvester,
    [creepRole.UPGRADER]: runUpgrader,
    [creepRole.BUILDER]: runBuilder,
    [creepRole.REPAIRER]: runUpgrader
  };
  run[creep.memory.role](creep);
}

function runHarvester(creep: Creep) {
  const state = creep.memory as HarvesterState;

  if (state.sourceId && state.isHarvesting) {
    if (creep.store.getUsedCapacity() === creep.store.getCapacity()) {
      state.isFull = true;
      state.isHarvesting = false;
    } else {
      const source = Game.getObjectById(state.sourceId);
      if (source) creep.harvest(source);
    }
  }

  if (state.destinationId && state.isUnloading) {
    if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
      state.isEmpty = true;
      state.isUnloading = false;
    } else {
      const destination = Game.getObjectById(state.destinationId);
      if (destination) creep.transfer(destination, RESOURCE_ENERGY);
    }
  }

  if (state.isEmpty) {
    // find nearest energy source id if it is not already in state/memory
    if (!state.sourceId) state.sourceId = creep.room.find(FIND_SOURCES_ACTIVE)[0].id;
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
    state.isHarvesting = false;
    if (!state.destinationId) state.destinationId = findDestinationId(creep);
    if (!state.destinationId) return;
    const destination = Game.getObjectById(state.destinationId);
    if (!destination) return;
    // if in range, start unloading energy
    if (creep.pos.inRangeTo(destination, 1)) {
      creep.transfer(destination, RESOURCE_ENERGY);
      state.isUnloading = true;
      state.isFull = false;
    } else {
      // else move closer
      creep.moveTo(destination, { visualizePathStyle: { stroke: "#ffaa00" } });
    }
  }
}

function runUpgrader(creep: Creep) {
  const state = creep.memory as UpgraderState;
  if (state.sourceId && state.isHarvesting) {
    if (creep.store.getUsedCapacity() === creep.store.getCapacity()) {
      state.isFull = true;
      state.isHarvesting = false;
    } else {
      const source = Game.getObjectById(state.sourceId);
      if (source) creep.harvest(source);
    }
  }

  if (state.controllerId && state.isUnloading) {
    if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
      state.isEmpty = true;
      state.isUnloading = false;
    } else {
      const destination = Game.getObjectById(state.controllerId);
      if (destination) creep.transfer(destination, RESOURCE_ENERGY);
    }
  }

  if (state.isEmpty) {
    // find nearest energy source id if it is not already in state/memory
    if (!state.sourceId) {
      state.sourceId = creep.room.find(FIND_SOURCES_ACTIVE)[0].id;
    }
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
    if (creep.pos.inRangeTo(controller, 1)) {
      creep.transfer(controller, RESOURCE_ENERGY);
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
  if (state.isBuilding && state.constructionId) {
    if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
      state.isEmpty = true;
      state.isBuilding = false;
    } else {
      // check if construction site still exists and keep working
      const constructionSite = Game.getObjectById(state.constructionId);
      if (constructionSite) {
        creep.build(constructionSite);
      } else {
        state.isBuilding = false;
        state.constructionId = findConstructionSiteId(creep);
      }
    }
  }

  // if harvesting, keep on harvesting
  if (state.isHarvesting && state.sourceId) {
    if (creep.store.getUsedCapacity() === creep.store.getCapacity()) {
      state.isFull = true;
    } else {
      const source = Game.getObjectById(state.sourceId);
      if (source) creep.harvest(source);
    }
  }

  // if empty, go harvest
  if (state.isEmpty) {
    if (!state.sourceId) state.sourceId = creep.room.find(FIND_SOURCES)[0].id;
    if (!state.sourceId) return;
    const source = Game.getObjectById(state.sourceId);
    if (!source) return;
    if (creep.pos.inRangeTo(source, 1)) {
      creep.harvest(source);
      state.isHarvesting = true;
      state.isEmpty = false;
    } else {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#831383" } });
    }
  }

  // if full, check if there is anything to build
  if (state.isFull) {
    state.isHarvesting = false;
    if (!state.constructionId) state.constructionId = findConstructionSiteId(creep);
    if (!state.constructionId) return;
    const constructionSite = Game.getObjectById(state.constructionId);
    if (!constructionSite) return;
    // if in range, start building
    if (creep.pos.inRangeTo(constructionSite, 1)) {
      creep.build(constructionSite);
      state.isBuilding = true;
      state.isFull = false;
    } else {
      // else move closer
      creep.moveTo(constructionSite, { visualizePathStyle: { stroke: "#831383" } });
    }
  }
}

function generateCreepName(r: creepRole): string {
  return `${r}-${Game.time}`;
}

function findDestinationId(creep: Creep): Id<AnyStructure> | undefined {
  const targets = creep.room.find(FIND_STRUCTURES, {
    filter: structure =>
      (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) &&
      structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  });
  console.log(JSON.stringify(targets));
  return targets.length > 0 ? targets[0].id : undefined;
}

function findControllerId(creep: Creep): Id<StructureController> | undefined {
  return creep.room.controller ? creep.room.controller.id : undefined;
}

function findConstructionSiteId(creep: Creep): Id<ConstructionSite<BuildableStructureConstant>> | undefined {
  const targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  return targets.length > 0 ? targets[0].id : undefined;
}
