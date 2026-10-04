import {rmSync} from 'node:fs';
export default function setup(){for(const prefix of ['e2e-company.sqlite','e2e-checkpoints.sqlite'])for(const suffix of ['','-wal','-shm'])rmSync(`./data/${prefix}${suffix}`,{force:true})}
