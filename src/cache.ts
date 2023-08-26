import { Router } from 'express';
import * as k8s from '@kubernetes/client-node';
import * as sqlite3 from 'sqlite3';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const verboseSqlite = sqlite3.verbose();
const db = new verboseSqlite.Database(':memory');

function all(query: string, namedParameters: any): Promise<any> {
    return new Promise((resolve, reject) => {
        db.all(query, namedParameters, function (error: Error, rows: any[]) {
            if (error) {
                console.error(error);
                reject(error);
            }

            resolve(rows);
        });
    });
}

function run(query: string, namedParameters: any): Promise<any> {
    return new Promise((resolve, reject) => {
        db.run(query, namedParameters, function (error: Error, rows: any[]) {
            if (error) {
                console.error(error);
                reject(error);
            }

            resolve(rows);
        });
    });
}

async function tableExists(tableName: string): Promise<boolean> {
    const result = await all(`SELECT name FROM sqlite_master WHERE type='table' AND name=$tableName;`, { $tableName: tableName });
    return result.length > 0;
}

async function createTable(tableName: string): Promise<void> {
    if (!tableExists(tableName)) {
        await run("CREATE TABLE $tableName (data TEXT)", { $tableName: tableName });
    }
}

async function startResourceCaching(resource: string): Promise<void> {
    const listFn = () => k8sApi.listConfigMapForAllNamespaces();
    const informer = k8s.makeInformer(kc, '/api/v1/configmaps', listFn);

    informer.on('add', (obj: k8s.V1Pod) => {
        console.log(`Added: ${obj.metadata!.name}`);
    });
    informer.on('update', (obj: k8s.V1Pod) => {
        console.log(`Updated: ${obj.metadata!.name}`);
    });
    informer.on('delete', (obj: k8s.V1Pod) => {
        console.log(`Deleted: ${obj.metadata!.name}`);
    });
    informer.on('error', (err: k8s.V1Pod) => {
        console.error(err);
        // Restart informer after 5sec
        setTimeout(() => {
            informer.start();
        }, 5000);
    });

    informer.start();
};

export async function init() {
    createTable('testTable');
    startResourceCaching('test');
}

export async function listResource(type: string, countPerPage: number, page: number, sortBy: string[], filterFields?: string[], filter?: string) {

}
