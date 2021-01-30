// example declaration file - remove these and add your own custom typings

// memory extension samples
export enum creepRole {
  HARVESTER = "HARVESTER",
  UPGRADER = "UPGRADER",
  BUILDER = "BUILDER",
  REPAIRER = "REPAIRER"
}

export type CreepsByRole = {
  [P in keyof typeof creepRole]: CustomCreep[];
};

export interface CustomCreep extends Creep {
  memory: CreepMemory;
}

export interface CreepMemory {
  role: creepRole;
  room: string;
}

export interface HarvesterState extends CreepMemory {
  isFull: boolean;
  isEmpty: boolean;
  isHarvesting: boolean;
  isUnloading: boolean;
  sourceId?: Id<Source>;
  destinationId?: Id<AnyStructure>;
}

export interface BuilderState extends CreepMemory {
  isFull: boolean;
  isEmpty: boolean;
  isHarvesting: boolean;
  isBuilding: boolean;
  sourceId?: Id<Source>;
  constructionId?: Id<ConstructionSite<BuildableStructureConstant>>;
}

export interface UpgraderState extends CreepMemory {
  isFull: boolean;
  isEmpty: boolean;
  isHarvesting: boolean;
  isUnloading: boolean;
  sourceId?: Id<Source>;
  controllerId?: Id<StructureController>;
}
