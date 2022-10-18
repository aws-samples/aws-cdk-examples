// lib/yelb_non_helm_addon.ts
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { setPath } from '@aws-quickstart/eks-blueprints/dist/utils/object-utils';
import { KubernetesManifest, KubernetesPatch } from "aws-cdk-lib/aws-eks";
import { loadYaml, readYamlDocument } from "../lib/utils/yaml-utils";

export class YelbNonHelmAddOn implements blueprints.ClusterAddOn {

   deploy(clusterInfo: blueprints.ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        
        const namespace = {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {
                "name": "yelb"
            }
        }

        const db_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-db"
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "yelb-db",
                        "tier": "backenddb"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "yelb-db",
                            "tier": "backenddb"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "yelb-db",
                                "image": "mreferre/yelb-db:0.5",
                                "ports": [
                                    {
                                        "containerPort": 5432
                                    }
                                ],
                                // "resources": {
                                //     "limits": {
                                //         "cpu": "200m",
                                //         "memory": "128Mi"
                                //     },
                                //     "requests": {
                                //         "cpu": "150",
                                //         "memory": "100Mi"
                                //     }
                                // }
                            }
                        ]
                    }
                }
            }
        }
        
        const db_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-db",
                "labels": {
                    "app": "yelb-db",
                    "tier": "backenddb"
                }
            },
            "spec": {
                "type": "ClusterIP",
                "ports": [
                    {
                        "port": 5432
                    }
                ],
                "selector": {
                    "app": "yelb-db",
                    "tier": "backenddb"
                }
            }
        }
        
        const redis_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "redis-server"
            },
            "spec": {
                "selector": {
                    "matchLabels": {
                        "app": "redis-server",
                        "tier": "cache"
                    }
                },
                "replicas": 1,
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "redis-server",
                            "tier": "cache"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "redis-server",
                                "image": "redis:4.0.2",
                                "ports": [
                                    {
                                        "containerPort": 6379
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        const redis_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "redis-server",
                "labels": {
                    "app": "redis-server",
                    "tier": "cache"
                }
            },
            "spec": {
                "type": "ClusterIP",
                "ports": [
                    {
                        "port": 6379
                    }
                ],
                "selector": {
                    "app": "redis-server",
                    "tier": "cache"
                }
            }
        }
        
        const app_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-appserver"
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "yelb-appserver",
                        "tier": "middletier"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "yelb-appserver",
                            "tier": "middletier"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "yelb-appserver",
                                "image": "mreferre/yelb-appserver:0.5",
                                "ports": [
                                    {
                                        "containerPort": 4567
                                    }
                                ],
                                // "resources": {
                                //     "limits": {
                                //         "cpu": "50m",
                                //         "memory": "32Mi"
                                //     },
                                //     "requests": {
                                //         "cpu": "40",
                                //         "memory": "20Mi"
                                //     }
                                // }
                            }
                        ]
                    }
                }
            }
        }
        const app_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-appserver",
                "labels": {
                    "app": "yelb-appserver",
                    "tier": "middletier"
                }
            },
            "spec": {
                "type": "ClusterIP",
                "ports": [
                    {
                        "port": 4567
                    }
                ],
                "selector": {
                    "app": "yelb-appserver",
                    "tier": "middletier"
                }
            }
        }
        
        const ui_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-ui"
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "yelb-ui",
                        "tier": "frontend"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "yelb-ui",
                            "tier": "frontend"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "yelb-ui",
                                "image": "mreferre/yelb-ui:0.7",
                                "ports": [
                                    {
                                        "containerPort": 80
                                    }
                                ],
                                // "resources": {
                                //     "limits": {
                                //         "cpu": "50m",
                                //         "memory": "32Mi"
                                //     },
                                //     "requests": {
                                //         "cpu": "40m",
                                //         "memory": "30Mi"
                                //     }
                                // }
                            }
                        ]
                    }
                }
            }
        }
        const ui_service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "namespace": "yelb",
                "name": "yelb-ui",
                "labels": {
                    "app": "yelb-ui",
                    "tier": "frontend"
                }
            },
            "spec": {
                "type": "LoadBalancer",
                "ports": [
                    {
                        "port": 80,
                        "protocol": "TCP",
                        "targetPort": 80
                    }
                ],
                "selector": {
                    "app": "yelb-ui",
                    "tier": "frontend"
                }
            }
        }

        const db_latency = {
            "apiVersion": "chaos-mesh.org/v1alpha1",
            "kind": "NetworkChaos",
            "metadata": {
                "name": "latency-db"
            },
            "spec": {
                "action": "delay",
                "delay": {
                    "correlation": "0",
                    "jitter": "0ms",
                    "latency": "300ms"
                },
                "direction": "to",
                "duration": "1h",
                "mode": "all",
                "selector": {
                    "labelSelectors": {
                        "tier": "backenddb"
                    },
                    "namespaces": [
                        "yelb"
                    ]
                }
            }
        }
        
        const ui_pods_failure = {
            "kind": "PodChaos",
            "apiVersion": "chaos-mesh.org/v1alpha1",
            "metadata": {
                "name": "ui-pods-failure"
            },
            "spec": {
                "selector": {
                    "namespaces": [
                        "yelb"
                    ],
                    "labelSelectors": {
                        "tier": "frontend"
                    }
                },
                "mode": "all",
                "action": "pod-kill",
                "duration": "1h",
                "gracePeriod": 0
            }
        }
        
        // Apply manifest
                // const docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, cluster.stack.region);
        // const doc = readYamlDocument(__dirname + '/manifests/apps/yelb_initial_deployment.yaml');
        // ... apply any substitutions for dynamic values 
        // const manifest = doc.split("---").map(e => loadYaml(e));
        new KubernetesManifest(cluster.stack, "yelb-manifest", {
            cluster,
            manifest: [
                namespace,
                db_deployment,
                db_service,
                redis_deployment, 
                redis_service, 
                app_deployment,
                app_service,
                ui_deployment, 
                ui_service,
                
                db_latency,
                ui_pods_failure,
                ],
            overwrite: true
        });
        // new KubernetesPatch(cluster.stack, "yelb-manifest-patch", {
        //     cluster,
        //     resourceName: "deployment/yelb-ui",
        //     resourceNamespace: "yelb",
        //     applyPatch: { spec: { replicas: 5 } },
        //     restorePatch: { spec: { replicas: 2 } },
        // });
    }
}