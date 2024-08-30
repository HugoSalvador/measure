import { Knex } from 'knex'

declare module 'knex/types/tables' {
    export interface Tables {
        measures: {
            id: string;
            type: string;
            image_url: string;
            value: number;
            date_measured: Date;
            customer_code: string;
            confirm_measure: boolean;
            created_at: Date;
            updated_at: Date;
        }
    }
}