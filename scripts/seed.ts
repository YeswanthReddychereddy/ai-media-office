import {CompanyRepository} from '../src/lib/db';
const repo=new CompanyRepository();repo.seed();console.log('Company ready. Existing work is preserved.');repo.close();
