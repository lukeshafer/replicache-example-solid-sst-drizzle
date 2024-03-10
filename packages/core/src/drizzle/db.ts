import { drizzle } from 'drizzle-orm/aws-data-api/pg'
import { RDSDataClient } from '@aws-sdk/client-rds-data'
import { RDS } from "sst/node/rds"
import * as schema from './schema'

export const db = drizzle(new RDSDataClient(), {
  database: RDS.Database.defaultDatabaseName,
  secretArn: RDS.Database.secretArn,
  resourceArn: RDS.Database.clusterArn,
  schema
})

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const serverID = 1;
