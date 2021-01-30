// example declaration file - remove these and add your own custom typings

// memory extension samples
export enum CreepRole {
  HARVESTER = "HARVESTER",
  UPGRADER = "UPGRADER",
  BUILDER = "BUILDER",
  REPAIRER = "REPAIRER"
}

export type CreepsByRole = {
  [P in keyof typeof CreepRole]: CustomCreep[];
};

export interface CustomCreep extends Creep {
  memory: CreepMemory;
}

export interface CreepMemory {
  role: CreepRole;
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

interface Memory {
  uuid: number;
  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
