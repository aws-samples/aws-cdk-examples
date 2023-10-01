import * as eks from 'aws-cdk-lib/aws-eks';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import * as fs from 'fs';
import * as yaml from 'js-yaml';


/**
 * Applies all manifests from a directory. Note: The manifests are not checked, 
 * so user must ensure the manifests have the correct namespaces. 
 * @param dir 
 * @param cluster 
 * @param namespaceManifest 
 */
export function applyYamlFromDir(dir: string, cluster: eks.Cluster, namespaceManifest: KubernetesManifest): void {
    fs.readdirSync(dir, { encoding: 'utf8' }).forEach((file, index) => {
        if (file.split('.').pop() == 'yaml') {
            const data = fs.readFileSync(dir + file, 'utf8');
            if (data != undefined) {  
                yaml.loadAll(data, function (item) {
                    const resources = cluster.addManifest(file.substring(0, file.length - 5) + index, <Record<string, any>[]>item);
                    resources.node.addDependency(namespaceManifest);
                });
            }
        }
    });
}

export function readYamlDocument(path: string): string {
    try {
        const doc = fs.readFileSync(path, 'utf8');
        return doc;
    } catch (e) {
        console.log(e + ' for path: ' + path);
        throw e;
    }
}


export function loadYaml(document: string): any {
    return yaml.load(document);
}

export function loadExternalYaml(url: string): any {
    /* eslint-disable */
    const request = require('sync-request'); // moved away from import as it is causing open handles that prevents jest from completion
    const response = request('GET', url);
    return yaml.loadAll(response.getBody().toString());
}

export function serializeYaml(document: any): string {
    return yaml.dump(document);
}