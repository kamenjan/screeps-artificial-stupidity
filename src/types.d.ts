// example declaration file - remove these and add your own custom typings

interface Memory {
  uuid: number;
  log: any;
}

// interface RoomMemory {
//   sources: {
//     id: string;
//     workerCount: number;
//   }[];
// }
interface RoomMemory {
  // sources: Record<Id<Source>, { workerCount: number }>;
  sources: Record<string, { workerCount: number }>;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
