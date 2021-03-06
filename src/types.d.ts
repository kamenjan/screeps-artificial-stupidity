// example declaration file - remove these and add your own custom typings

interface Memory {
  uuid: number;
  log: any;
}

interface RoomMemory {
  // sources: Record<Id<Source>, { workerCount: number }>;
  // sources: Record<string, { workerCount: number }>;
  sources: Record<string, { harvesters: Id<Creep>[] }>;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
